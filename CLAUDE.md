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
cp .env.example .env                  # set GROQ_API_KEY, POSTGRES_PASSWORD, AI_SHARED_SECRET
docker compose up -d --build          # only the backend is published, on :8080 (BACKEND_PORT)
```

No unit test needs an API key or network access: the product databases, the AI service and Groq are stubbed.
`mvn verify` also runs the Testcontainers tests (skipped without Docker) and fails below 80% line coverage.
To give Testcontainers Docker inside the Maven container, add
`-v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal`.

### End-to-end (`e2e/`, Playwright)

Runs against the real stack in mock mode (no Groq key needed):

```bash
export MOCK_AI=1 POSTGRES_PASSWORD=e2e AI_SHARED_SECRET=e2e API_KEY=e2e-key CORS_ALLOWED_ORIGINS=http://localhost:8081
docker compose up -d --build --wait
(cd mobile && EXPO_PUBLIC_API_BASE=http://localhost:8080 EXPO_PUBLIC_API_KEY=e2e-key npm run build:web)
cd e2e && npm ci && npx playwright install chromium && npx playwright test
npm run screenshots           # also saves screenshots of the web app to docs/screenshots
```

The rate-limit test uses up the per-IP budget for a minute; wait a minute before running the suite again.

## Rules

- After every change, all four checks must pass before the work counts as done:
  - `mvn test` (backend)
  - `python -m pytest` (ai-service)
  - `npm test` (mobile)
  - `npm run typecheck` (mobile)
- Work in phases. Each phase ends with exactly one commit, made only after the four checks pass.
- Do not add Claude attribution to commits or pull requests: no `Co-Authored-By: Claude` trailer and no "Generated with Claude Code" line.
- Schema changes go in a new Flyway file (`backend/src/main/resources/db/migration/V<n>__<what>.sql`); never edit an applied migration. Hibernate only validates.
- `main` is the only long-lived branch. CI (`.github/workflows/ci.yml`) runs on pushes to `main` and on pull requests.
