"""Settings from the environment, read once at start-up."""
import os

# Shared with the backend; when set, every endpoint except /health needs it in X-Internal-Secret
AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET", "")
SECRET_HEADER = "X-Internal-Secret"

# MOCK_AI=1 answers every request with canned JSON: no Groq key, no network
MOCK_AI = os.getenv("MOCK_AI", "").lower() in ("1", "true", "yes")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
# Each Groq call gets 30 s and one retry (the SDK retries on timeouts, 429 and 5xx), so the
# worst case stays within the backend's 60 s limit
GROQ_TIMEOUT_SECONDS = 30.0
GROQ_MAX_RETRIES = 1

TEXT_MODEL = "openai/gpt-oss-20b"
VISION_MODEL = "qwen/qwen3.8-27b"
