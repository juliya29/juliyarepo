import React from 'react'
import RiskAnalyzer from './components/RiskAnalyzer'

export default function App(){
  return (
    <div className="app-container">
      <header>
        <h1>Risk QA — Requirement Analyzer</h1>
      </header>
      <main>
        <RiskAnalyzer />
      </main>
    </div>
  )
}
