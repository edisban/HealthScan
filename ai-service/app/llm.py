"""The model client: Groq through the async OpenAI SDK, or the canned stand-in when MOCK_AI is on."""
from fastapi import HTTPException, Request
from openai import AsyncOpenAI

from app import config
from app.mock_ai import MockGroq


def make_client(mock: bool, api_key: str):
    """Returns the client the endpoints use, or None when there is neither a key nor mock mode."""
    if mock:
        return MockGroq()
    if not api_key:
        return None
    return AsyncOpenAI(
        base_url=config.GROQ_BASE_URL,
        api_key=api_key,
        timeout=config.GROQ_TIMEOUT_SECONDS,
        max_retries=config.GROQ_MAX_RETRIES,
    )


def get_client(request: Request):
    """FastAPI dependency for the client made at start-up; tests replace it with a fake."""
    client = getattr(request.app.state, "llm", None)
    if client is None:
        raise HTTPException(status_code=503, detail="AI client not available. Set GROQ_API_KEY or MOCK_AI=1.")
    return client


async def complete(client, **request) -> str:
    """One chat completion; returns the text of the answer."""
    completion = await client.chat.completions.create(**request)
    return completion.choices[0].message.content
