// llmAnalyzer.js
// Placeholder scaffolding for calling an LLM (e.g., OpenAI). This file does not include a real call —
// it returns an error instructing how to enable LLM mode. You can expand this with your preferred SDK.

module.exports.analyze = async function(requirement){
  if(!process.env.OPENAI_API_KEY){
    throw new Error('LLM analyzer requested but OPENAI_API_KEY is not set. Set OPENAI_API_KEY in the environment or switch ANALYZER=rules')
  }

  // Implement actual LLM call here (OpenAI, Anthropic, etc.). The LLM should return the JSON following the schema.

  throw new Error('LLM analyzer is not implemented in this starter. Please implement an SDK call in backend/analyzer/llmAnalyzer.js')
}
