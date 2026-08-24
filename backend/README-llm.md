## LLM mode

This branch includes an implementation of the LLM-based analyzer using the OpenAI Chat Completions API.

To enable LLM analyzer:

1) Set environment variables in the backend environment (see .env.example):

- ANALYZER=llm
- OPENAI_API_KEY=your_api_key_here
- OPENAI_MODEL (optional, default: gpt-4)
- LLM_MAX_RETRIES (optional, default: 3)
- LLM_TIMEOUT_MS (optional, default: 15000)

2) Start the backend:

cd backend
npm install
ANALYZER=llm OPENAI_API_KEY=... npm start

Notes & safety
- The LLM analyzer will send the requirement text to OpenAI. Do not send PII or secrets unless you accept sending them to OpenAI.
- The analyzer instructs the model to return only JSON following the schema in backend/ajv-schema.json and will retry up to LLM_MAX_RETRIES if the model returns non-JSON or invalid JSON.
