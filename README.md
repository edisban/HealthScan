# Health Scan

A full-stack health and nutrition scanning app. Scan product barcodes or take photos of fruits to analyze nutritional value, ingredients, and fruit quality using AI.

## Architecture

| Layer | Tech | Port |
|-------|------|------|
| Mobile | React Native + Expo, TypeScript | 8086 |
| Backend | Spring Boot 3, Java 17, WebFlux | 8080 |
| AI Service | FastAPI, YOLOv8n, Groq LLM | 8000 |
| Database | PostgreSQL | 5432 |

```
Mobile ──▶ Backend ──▶ AI Service
              ▲          ▲
              │          │
          PostgreSQL   (YOLO + Groq)
```

## Quick Start (Docker)

```bash
docker compose up -d --build
```

Services:
- **Backend API**: `http://localhost:8080`
- **AI Service**: `http://localhost:8000`
- **Postgres**: `localhost:5432`
- **Mobile**: `npm start` in `mobile/` (port 8086)

Create a `.env` in the root with your `GROQ_API_KEY` (get one at https://console.groq.com).

## Mobile Setup

```bash
cd mobile
npm install
npm start          # LAN mode — same Wi-Fi as your phone
```

Open Expo Go on your phone and scan the QR code, or enter `exp://YOUR_IP:8086`.

TypeScript check: `npx tsc --noEmit`

## API Endpoints

**Backend** (`:8080/api/v1`)
- `GET /product/{barcode}?lang=en\|el` — product analysis
- `POST /analyze-image-base64` — image analysis (base64 JSON)

**AI Service** (`:8000`)
- `POST /analyze-image` — fruit detection + quality (YOLO + vision LLM)
- `GET /health`

## Project Structure

```
health-scan/
├── docker-compose.yml
├── .env
├── backend/          # Spring Boot API
├── ai-service/       # FastAPI AI microservice
└── mobile/           # React Native (Expo) app
    ├── App.tsx
    └── src/
        ├── api/      # API clients
        ├── components/ui/
        ├── context/  # Theme + Language
        ├── hooks/    # useProduct, useCamera, useImageAnalysis
        ├── screens/  # HomeScreen
        └── constants/
```

## Troubleshooting

- **Camera permission**: Grant when prompted in Expo Go
- **Barcode not scanning**: Good lighting, center the barcode
- **AI errors**: Verify `GROQ_API_KEY` is set and containers rebuilt
- **Connection refused**: Run `docker compose ps` to confirm containers are up