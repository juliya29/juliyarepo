const fetch = require('node-fetch')
const Ajv = require('ajv')
const schema = require('../ajv-schema.json')

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
const MAX_RETRIES = parseInt(process.env.LLM_MAX_RETRIES || '3', 10)
const TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '15000', 10)

if(!OPENAI_API_KEY){
  // We still export analyze but it will throw when called
}

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractJsonFromText(text){
  if(!text) return null
  // Try to find a ```json ... ``` code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if(codeBlockMatch && codeBlockMatch[1]){
    const candidate = codeBlockMatch[1].trim()
    try{ return JSON.parse(candidate) }catch(e){}
  }

  // Otherwise, attempt to find the first balanced JSON object by scanning for braces
  const firstBrace = text.indexOf('{')
  if(firstBrace === -1) return null
  let i = firstBrace
  let depth = 0
  for(; i < text.length; i++){
    const ch = text[i]
    if(ch === '{') depth++
    else if(ch === '}') depth--
    if(depth === 0){
      const candidate = text.substring(firstBrace, i+1)
      try{ return JSON.parse(candidate) }catch(e){
        // continue searching in case of embedded braces
      }
    }
  }
  // Fallback: try to parse any substring that looks like JSON object using regex - last resort
  const looseMatch = text.match(/(\{[\s\S]*\})/)
  if(looseMatch){
    try{ return JSON.parse(looseMatch[1]) }catch(e){}
  }
  return null
}

async function callOpenAI(messages, timeoutMs){
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const id = controller ? setTimeout(()=>controller.abort(), timeoutMs) : null
  try{
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.2,
        max_tokens: 2000
      }),
      signal: controller ? controller.signal : undefined
    })
    if(id) clearTimeout(id)
    if(!res.ok){
      const text = await res.text()
      throw new Error(`OpenAI API error: ${res.status} ${text}`)
    }
    const data = await res.json()
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    return content
  }catch(err){
    if(err.name === 'AbortError') throw new Error('OpenAI request timed out')
    throw err
  }
}

module.exports.analyze = async function(requirement){
  if(!OPENAI_API_KEY) throw new Error('LLM analyzer requested but OPENAI_API_KEY is not set. Set OPENAI_API_KEY in the environment or switch ANALYZER=rules')

  const ajv = new Ajv({ allErrors: true, strict: false })
  const validate = ajv.compile(schema)

  const systemPrompt = `You are a requirements risk analyst. Your job is to find and list any possible risks, missing requirements, edge cases, and regression areas from a software requirement. Be SENSITIVE: list any potential issue even if low-likelihood or low-severity. If uncertain, err on the side of listing an item with "Low" severity and a brief rationale.

Return ONLY a single JSON object that exactly follows this structure (no surrounding text):
{
  "riskScore": integer 0-100,
  "riskLevel": "Low"|"Medium"|"High",
  "businessRisks": array of objects (each may have title,severity,description,mitigation),
  "technicalRisks": array of objects,
  "securityRisks": array of objects,
  "missingRequirements": array of objects,
  "edgeCases": array of objects,
  "regressionAreas": array of objects,
  "explainers": { "howScoreWasComputed": string, "confidence": string }
}

Guidelines:
- Use severity/likelihood/impact values: Low, Medium, or High.
- Include concise mitigations for each risk when possible.
- Always return arrays (use [] when empty).
- Do not invent metrics. If you cannot compute a numeric riskScore precisely, provide a reasonable estimate and explain the method in explainers.howScoreWasComputed.
- Be concise but thorough. Include items for common omissions: authentication/authorization, input validation, rate-limiting, error handling, logging/monitoring, performance SLAs, data retention/backup, encryption in transit/at rest, third-party dependency failures, API versioning, concurrency/idempotency, and CORS/CSP/security headers.

Examples (for clarity only, do not include these examples in your output):
- If the requirement mentions a payment flow but does not mention PCI or secure handling -> add a High security risk: "Payment handling missing PCI controls" with mitigation.
- If the requirement describes endpoints but never mentions authentication -> add a Medium/High security risk: "Missing auth".
- If performance or SLAs are not stated -> add a Missing Requirement: "Performance targets not stated".
`

  const userPrompt = `Requirement:\n\n"""\n${requirement.trim()}\n"""\n\nRemember: return only JSON following the exact schema.`

  let attempt = 0
  let lastError = null
  while(attempt < MAX_RETRIES){
    attempt++
    try{
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
      const content = await callOpenAI(messages, TIMEOUT_MS)
      if(!content) throw new Error('Empty response from OpenAI')

      // Try to extract JSON from the content
      const parsed = extractJsonFromText(content)
      if(!parsed){
        lastError = new Error('Could not extract JSON from model response')
        const clarify = `The previous response was not valid JSON. Please reply with only the JSON object (no explanation). Follow the exact schema previously provided.`
        await sleep(500 * attempt)
        const clarificationMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content },
          { role: 'user', content: clarify }
        ]
        const content2 = await callOpenAI(clarificationMessages, TIMEOUT_MS)
        const parsed2 = extractJsonFromText(content2)
        if(parsed2){
          if(validate(parsed2)) return parsed2
          lastError = new Error('Parsed JSON failed schema validation on retry')
          continue
        } else {
          continue
        }
      }

      // Validate parsed JSON
      const valid = validate(parsed)
      if(!valid){
        const errorsText = ajv.errorsText(validate.errors)
        lastError = new Error(`Analyzer output failed schema validation: ${errorsText}`)
        const feedback = `The JSON you returned failed schema validation: ${errorsText}. Please return corrected JSON only.`
        await sleep(500 * attempt)
        const clarificationMessages = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: JSON.stringify(parsed) },
          { role: 'user', content: feedback }
        ]
        const content2 = await callOpenAI(clarificationMessages, TIMEOUT_MS)
        const parsed2 = extractJsonFromText(content2)
        if(parsed2 && validate(parsed2)) return parsed2
        continue
      }

      // All good
      return parsed
    }catch(err){
      lastError = err
      await sleep(500 * attempt)
    }
  }

  throw new Error(`LLM analyzer failed after ${MAX_RETRIES} attempts: ${lastError && lastError.message}`)
}
