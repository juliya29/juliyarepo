// Simple rules-based analyzer as a fallback/demo

function severityFromCount(count){
  if(count >= 3) return 'High'
  if(count === 2) return 'Medium'
  return 'Low'
}

function computeScore(counts){
  // counts: { security, business, technical, missing }
  const weights = { security: 0.35, business: 0.30, technical: 0.20, missing: 0.15 }
  const maxPerCategory = 5 // assume
  const security = Math.min(counts.security, maxPerCategory) / maxPerCategory
  const business = Math.min(counts.business, maxPerCategory) / maxPerCategory
  const technical = Math.min(counts.technical, maxPerCategory) / maxPerCategory
  const missing = Math.min(counts.missing, maxPerCategory) / maxPerCategory

  const raw = (security*weights.security + business*weights.business + technical*weights.technical + missing*weights.missing)
  return Math.round(raw * 100)
}

module.exports.analyze = async function(requirement){
  const text = requirement.toLowerCase()
  const business = []
  const technical = []
  const security = []
  const missing = []
  const edge = []
  const regression = []

  // simple keyword heuristics
  if(text.includes('auth') || text.includes('authorization') || text.includes('login') || text.includes('token')){
    security.push({ title: 'Auth/Authorization not specified', severity: 'High', description: 'Requirement mentions authentication-related features but does not specify access controls', mitigation: 'Define roles and access control rules' })
  }
  if(text.includes('performance') || text.includes('latency') || text.includes('throughput')){
    missing.push({ id: 1, description: 'Performance SLA not specified', impact: 'High' })
    technical.push({ title: 'Performance constraints unspecified', severity: 'Medium', description: 'No clear performance or SLA targets', mitigation: 'Add response time targets and load expectations' })
  }
  if(text.includes('payment') || text.includes('card') || text.includes('pci')){
    security.push({ title: 'Payment handling requirements', severity: 'High', description: 'Sensitive payment processing requires PCI and secure handling', mitigation: 'Use PCI-compliant processors and encrypt data in transit and at rest' })
  }
  if(text.includes('third-party') || text.includes('external api') || text.includes('api')){
    technical.push({ title: 'Third-party dependency', severity: 'Medium', description: 'Relies on external API; consider failures and retries', mitigation: 'Add retries, timeouts, and fallbacks' })
    regression.push({ area: 'Integration with external service', whyLikely: 'External API changes may break integration', testsSuggested: ['integration: external API mock', 'e2e: happy/failure flows'] })
  }
  if(text.includes('email') || text.includes('notification')){
    edge.push({ description: 'Email delivery delays or failures', likelihood: 'Medium', impact: 'Medium' })
  }
  if(text.includes('admin') || text.includes('bulk')){
    business.push({ title: 'Admin misuse or bulk operations', severity: 'Medium', description: 'Bulk operations could cause unexpected load or data corruption', mitigation: 'Add rate limits and bulk operation safeguards' })
  }

  // fallback sample items if none detected
  if(business.length === 0) business.push({ title: 'Unclear success metric', severity: 'Medium', description: 'No measurable KPI specified', mitigation: 'Define target KPIs' })
  if(technical.length === 0) technical.push({ title: 'Undefined error handling', severity: 'Low', description: 'Spec lacks detailed error handling guidance', mitigation: 'Add error cases and retries' })
  if(security.length === 0) security.push({ title: 'No explicit security requirements', severity: 'Medium', description: 'Requirement does not mention authentication, authorization, or data protection', mitigation: 'Specify required security controls' })

  const counts = { security: security.length, business: business.length, technical: technical.length, missing: missing.length }
  const riskScore = computeScore(counts)
  const riskLevel = riskScore <= 30 ? 'Low' : (riskScore <= 60 ? 'Medium' : 'High')

  return {
    riskScore,
    riskLevel,
    businessRisks: business,
    technicalRisks: technical,
    securityRisks: security,
    missingRequirements: missing,
    edgeCases: edge,
    regressionAreas: regression,
    explainers: {
      howScoreWasComputed: 'Weighted sum of Security(35%), Business(30%), Technical(20%), Missing(15%) with simple keyword-based counts',
      confidence: 'Low'
    }
  }
}
