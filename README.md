# Risk QA Starter

This repository branch contains a minimal starter for the Risk QA feature: a React frontend and an Express backend with a simple rules-based analyzer and scaffolding for an LLM analyzer.

Getting started (defaults)

1) Backend

cd backend
npm install
npm run start

This starts an Express server on port 4000 by default.

2) Frontend

cd frontend
npm install
npm run dev

By default the frontend uses http://localhost:4000 as the API URL. You can set VITE_API_URL to change that.

Switching analyzer

In backend, set environment variable ANALYZER to either "rules" (default) or "llm". If you use "llm" you must set OPENAI_API_KEY in the environment and implement the LLM call in backend/analyzer/llmAnalyzer.js.

Notes
- No secrets are committed. See .env.example for env var names.
- The rules-based analyzer is intentionally simple for a starter/demo.

