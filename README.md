# Health Scan

Health Scan is a mobile app that scans product barcodes and uses AI to analyze their nutritional health value.

## Stack
- Frontend: React Native (Expo SDK 58), React 19, expo-camera, expo-blur, expo-linear-gradient
- Backend: Spring Boot (Java), PostgreSQL, WebClient
- AI/ML: FastAPI (Python), Groq LLM API (OpenAI-compatible), model `openai/gpt-oss-20b`
- Infra: Docker Compose (postgres, backend, ai-service)

## How the AI/ML works
1. Mobile scans a barcode and calls `GET /api/v1/product/{barcode}?lang=el|en`.
2. Backend fetches product data (name, image, ingredients) from Open Food Facts.
3. Backend forwards ingredients to the AI service (`POST /analyze`).
4. AI service builds a prompt and calls the Groq LLM, which returns a JSON payload: health score (0-100%), explanation, pros, cons, product name, origin, ingredients, nutrition.
5. Backend responds with clean JSON; missing data falls back to defaults instead of 500.
6. Mobile renders the score gauge, explanation, pros, and cons in the selected language.
