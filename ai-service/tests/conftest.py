import asyncio
import io
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app import config
from app.llm import get_client
from app.main import app


class FakeGroq:
    """Stands in for the async OpenAI client: records each request and returns a canned reply."""

    def __init__(self):
        self.reply = "{}"
        self.requests = []
        # Seconds each call takes, and an exception to raise instead of answering
        self.delay = 0.0
        self.error = None
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.requests.append(kwargs)
        if self.delay:
            await asyncio.sleep(self.delay)
        if self.error is not None:
            raise self.error
        message = SimpleNamespace(content=self.reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture
def api(monkeypatch):
    # Start-up must not depend on the machine running the tests: no key and no mock mode
    monkeypatch.setattr(config, "GROQ_API_KEY", "")
    monkeypatch.setattr(config, "MOCK_AI", False)
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def use_client():
    """Makes the endpoints use the given client instead of the one made at start-up."""
    def use(client):
        app.dependency_overrides[get_client] = lambda: client
        return client
    yield use
    app.dependency_overrides.clear()


@pytest.fixture
def groq(use_client):
    return use_client(FakeGroq())


@pytest.fixture
def shared_secret(monkeypatch):
    monkeypatch.setattr(config, "AI_SHARED_SECRET", "s3cret")
    return "s3cret"


def jpeg(size=(64, 64)):
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 30, 30)).save(buf, format="JPEG")
    return {"file": ("photo.jpg", buf.getvalue(), "image/jpeg")}
