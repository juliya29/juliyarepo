import React, { useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function RiskAnalyzer(){
  const [requirement, setRequirement] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function analyze(){
    setLoading(true)
    setError(null)
    setResult(null)
    try{
      const res = await fetch(`${API_URL}/api/analyzeRequirement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requirement })
      })
      if(!res.ok){
        const text = await res.text()
        throw new Error(text || 'Server error')
      }
      const json = await res.json()
      setResult(json)
    }catch(e){
      setError(e.message)
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="risk-analyzer">
      <label htmlFor="requirement">Requirement</label>
      <textarea id="requirement" value={requirement} onChange={e=>setRequirement(e.target.value)} rows={8} placeholder="Paste requirement text here" />
      <div className="controls">
        <button onClick={analyze} disabled={loading || !requirement.trim()}>{loading ? 'Analyzing...' : 'Analyze'}</button>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {result && (
        <div className="result">
          <div className="score-row">
            <div className={`pill ${result.riskLevel?.toLowerCase()}`}>{result.riskScore} — {result.riskLevel}</div>
            <div className="explain">Confidence: {result.explainers?.confidence || 'Unknown'}</div>
          </div>

          <Section title="Business Risks" items={result.businessRisks} />
          <Section title="Technical Risks" items={result.technicalRisks} />
          <Section title="Security Risks" items={result.securityRisks} />
          <Section title="Missing Requirements" items={result.missingRequirements} />
          <Section title="Edge Cases" items={result.edgeCases} />
          <Section title="Regression Areas" items={result.regressionAreas} />

          <div className="explainers">
            <h3>How score was computed</h3>
            <pre>{result.explainers?.howScoreWasComputed}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, items }){
  if(!items || items.length === 0) return (
    <div className="section empty"><h3>{title}</h3><div className="none">No items detected</div></div>
  )
  return (
    <div className="section">
      <h3>{title}</h3>
      <ul>
        {items.map((it, idx)=> (
          <li key={idx}>
            <strong>{it.title || it.area || it.description || `Item ${idx+1}`}</strong>
            {it.severity && <span className="sev">{it.severity}</span>}
            <div className="desc">{it.description || it.whyLikely || it.impact || ''}</div>
            {it.mitigation && <div className="mitigation"><strong>Mitigation:</strong> {it.mitigation}</div>}
            {it.testsSuggested && <div className="tests"><strong>Suggested tests:</strong> {it.testsSuggested.join(', ')}</div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
