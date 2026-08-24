const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const path = require('path')
const Ajv = require('ajv')

const rulesAnalyzer = require('./analyzer/rulesAnalyzer')
const llmAnalyzer = require('./analyzer/llmAnalyzer')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(bodyParser.json())

// Simple schema validation for responses
const schema = require('./ajv-schema.json')
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

app.post('/api/analyzeRequirement', async (req, res) => {
  const { requirement } = req.body
  if(!requirement || typeof requirement !== 'string'){
    return res.status(400).json({ error: 'requirement (string) is required in body' })
  }

  const analyzerMode = (process.env.ANALYZER || 'rules').toLowerCase()
  try{
    let result
    if(analyzerMode === 'llm'){
      result = await llmAnalyzer.analyze(requirement)
    } else {
      result = await rulesAnalyzer.analyze(requirement)
    }

    const valid = validate(result)
    if(!valid){
      console.error('Validation errors', validate.errors)
      return res.status(500).json({ error: 'Analyzer returned invalid result', details: validate.errors })
    }

    res.json(result)
  }catch(err){
    console.error(err)
    res.status(500).json({ error: err.message || 'analysis failed' })
  }
})

app.listen(PORT, ()=>{
  console.log(`Risk QA backend running on http://localhost:${PORT}`)
})
