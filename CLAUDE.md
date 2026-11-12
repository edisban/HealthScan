# CLAUDE.md

Health Scan: a React Native app that scores product barcodes and checks fruit freshness from photos.
Three services: `mobile/` (Expo, TypeScript), `backend/` (Spring Boot, Java 17) and `ai-service/` (FastAPI, Python 3.11, Groq).
The phone talks only to the backend; only the AI service holds `GROQ_API_KEY`.

## Build and test

### Backend (`backend/`)

```bash
cd backend
mvn test                      # JUnit, Mockito, MockMvc
mvn -B -DskipTests package    # build the jar
```

Maven is not on PATH on this machine. Run it through Docker instead (Git Bash, from the repo root):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)/backend:/app" -w /app maven:3.9-eclipse-temurin-17 mvn -B test
```

### AI service (`ai-service/`)

```bash
cd ai-service
pip install -r requirements-dev.txt
python -m pytest
```

The pinned packages target Python 3.11, the version in the Dockerfile and CI. If the local Python does not match, use Docker:

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)/ai-service:/app" -w /app python:3.11-slim \
  sh -c "pip install -q -r requirements-dev.txt && python -m pytest -p no:cacheprovider"
```

### Mobile (`mobile/`)

```bash
cd mobile
npm ci
npm test                      # Jest, React Native Testing Library
npm run typecheck             # tsc --noEmit
npm start                     # Expo dev server (or `npm start` from the repo root for LAN mode on port 8085)
```

### Whole stack

```bash
cp .env.example .env                  # set GROQ_API_KEY
docker compose up -d --build          # postgres :5432, ai-service :8000, backend :8080
```

No test needs an API key or network access: the product databases, the AI service and Groq are stubbed.

## Rules

- After every change, all four checks must pass before the work counts as done:
  - `mvn test` (backend)
  - `python -m pytest` (ai-service)
  - `npm test` (mobile)
  - `npm run typecheck` (mobile)
- Work in phases. Each phase ends with exactly one commit, made only after the four checks pass.
- Do not add Claude attribution to commits or pull requests: no `Co-Authored-By: Claude` trailer and no "Generated with Claude Code" line.
- `main` is the only long-lived branch. CI (`.github/workflows/ci.yml`) runs on pushes to `main` and on pull requests.
