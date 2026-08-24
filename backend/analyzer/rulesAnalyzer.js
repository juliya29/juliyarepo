// Extended rules-based analyzer with more heuristics to increase sensitivity

function severityFromCount(count){
  if(count >= 3) return 'High'
  if(count === 2) return 'Medium'
  return 'Low'
}

function computeScore(counts){
  const weights = { security: 0.35, business: 0.30, technical: 0.20, missing: 0.15 }
  const maxPerCategory = 5
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

  // security-related heuristics
  if(text.includes('auth') || text.includes('authorization') || text.includes('login') || text.includes('token') || text.includes('roles')){
    security.push({ title: 'Auth/Authorization not specified', severity: 'High', description: 'Requirement mentions authentication-related features but does not specify access controls', mitigation: 'Define roles and access control rules' })
  }
  // If endpoints/API described but no auth mentioned
  if((text.includes('endpoint') || text.includes('api') || text.includes('http') || text.includes('/api') || text.includes('request')) && !(text.includes('auth') || text.includes('login') || text.includes('oauth') || text.includes('token'))){
    security.push({ title: 'Missing authentication on described APIs', severity: 'Medium', description: 'APIs or endpoints are described without any mention of authentication or authorization', mitigation: 'Specify authentication methods, tokens, and role-based access control' })
  }

  // data protection and compliance
  if(text.includes('payment') || text.includes('card') || text.includes('pci') || text.includes('stripe')){
    security.push({ title: 'Payment handling requirements', severity: 'High', description: 'Sensitive payment processing requires PCI and secure handling', mitigation: 'Use PCI-compliant processors and encrypt data in transit and at rest' })
  }
  if(text.includes('personal data') || text.includes('pii') || text.includes('personal information') || text.includes('ssn')){
    security.push({ title: 'Personal data handling', severity: 'High', description: 'Requirement references personal data but does not describe protection or retention policies', mitigation: 'Specify data classification, retention policies, and encryption' })
  }

  // technical heuristics
  if(text.includes('performance') || text.includes('latency') || text.includes('throughput') || text.includes('sla')){
    missing.push({ id: 1, description: 'Performance SLA not specified', impact: 'High' })
    technical.push({ title: 'Performance constraints unspecified', severity: 'Medium', description: 'No clear performance or SLA targets', mitigation: 'Add response time targets and load expectations' })
  }
  if(text.includes('third-party') || text.includes('external api') || text.includes('external service') || text.includes('integration')){
    technical.push({ title: 'Third-party dependency', severity: 'Medium', description: 'Relies on external API; consider failures and retries', mitigation: 'Add retries, timeouts, and fallbacks' })
    regression.push({ area: 'Integration with external service', whyLikely: 'External API changes may break integration', testsSuggested: ['integration: external API mock', 'e2e: happy/failure flows'] })
  }
  if(text.includes('concurrent') || text.includes('concurrency') || text.includes('race') || text.includes('idempotent')){
    technical.push({ title: 'Concurrency and idempotency concerns', severity: 'Medium', description: 'Requirement mentions operations that may need idempotency or concurrency control', mitigation: 'Design idempotent endpoints and concurrency safeguards' })
  }
  if(text.includes('cache') || text.includes('caching')){
    technical.push({ title: 'Caching considerations', severity: 'Low', description: 'Caching is referenced or implied but cache invalidation is not described', mitigation: 'Define cache TTLs and invalidation strategies' })
  }
  if(text.includes('schema') && text.includes('version')){
    technical.push({ title: 'API/schema versioning', severity: 'Low', description: 'Schema or API versioning is referenced but not specified', mitigation: 'Define versioning strategy and compatibility guarantees' })
  }
  if(text.includes('email') || text.includes('notification')){
    edge.push({ description: 'Email delivery delays or failures', likelihood: 'Medium', impact: 'Medium' })
  }

  // reliability and observability
  if(text.includes('monitor') || text.includes('logging') || text.includes('metrics') || text.includes('audit')){
    technical.push({ title: 'Observability not defined', severity: 'Medium', description: 'Monitoring, logging, and alerting expectations are not specified', mitigation: 'Define metrics, logs, and alerting thresholds' })
  } else {
    // encourage observability if not mentioned
    technical.push({ title: 'No observability guidance', severity: 'Low', description: 'Requirement does not mention logging/metrics/alerts', mitigation: 'Add monitoring and logging requirements' })
  }

  // business risks
  if(text.includes('admin') || text.includes('bulk') || text.includes('export')){
    business.push({ title: 'Admin misuse or bulk operations', severity: 'Medium', description: 'Bulk operations could cause unexpected load or data corruption', mitigation: 'Add rate limits and bulk operation safeguards' })
  }
  if(!text.includes('success metric') && !text.includes('kpi') && !text.includes('metric')){
    business.push({ title: 'Unclear success metric', severity: 'Medium', description: 'No measurable KPI specified', mitigation: 'Define target KPIs' })
  }

  // missing security headers
  if(text.includes('cors') || text.includes('content-security-policy') || text.includes('csp')){
    security.push({ title: 'Security headers referenced', severity: 'Low', description: 'Security headers are mentioned but requirements are not explicit', mitigation: 'Specify required CORS/CSP/security headers and allowed origins' })
  }

  // input validation and error handling
  if(!(text.includes('validation') || text.includes('sanitize') || text.includes('input'))){
    technical.push({ title: 'No input validation guidance', severity: 'Low', description: 'Requirement does not specify input validation or sanitization', mitigation: 'Define input validation rules and error handling' })
  }
  if(!(text.includes('error') || text.includes('retry') || text.includes('fallback'))){
    technical.push({ title: 'Error handling and retry strategies missing', severity: 'Low', description: 'No explicit error handling or retry/fallback strategies described', mitigation: 'Add error handling and retry/backoff behavior' })
  }

  // fallback sample items if none detected
  if(business.length === 0) business.push({ title: 'Unclear success metric', severity: 'Low', description: 'No measurable KPI specified', mitigation: 'Define target KPIs' })
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
      howScoreWasComputed: 'Weighted sum of Security(35%), Business(30%), Technical(20%), Missing(15%) with heuristic counts',
      confidence: 'Low'
    }
  }
}
