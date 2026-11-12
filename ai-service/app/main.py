"""Builds the app: the model client for its lifetime, the shared-secret check and the endpoints.

Run with: uvicorn app.main:app
"""
from contextlib import asynccontextmanager

import openai
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app import config
from app.llm import make_client
from app.routes import router
from app.security import require_shared_secret


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.llm = make_client(config.MOCK_AI, config.GROQ_API_KEY)
    yield
    # Closes the HTTP connection pool of the real client; the mock has nothing to close
    close = getattr(app.state.llm, "close", None)
    if close is not None:
        await close()


app = FastAPI(title="Health Scan AI Service", lifespan=lifespan)
app.middleware("http")(require_shared_secret)
app.include_router(router)


# Groq failing is a bad upstream (502) or a slow one (504), not a bug in this service (500)
@app.exception_handler(openai.APITimeoutError)
async def model_timed_out(request: Request, exc: openai.APITimeoutError):
    return JSONResponse(status_code=504, content={"detail": "The AI model did not answer in time"})


@app.exception_handler(openai.APIError)
async def model_failed(request: Request, exc: openai.APIError):
    return JSONResponse(status_code=502, content={"detail": "The AI model could not answer"})
