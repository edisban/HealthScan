import base64
import hmac
import io
import json
import os
import re
from typing import List, Optional, Union

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator

from mock_ai import MockGroq

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

app = FastAPI(title="Health Scan AI Service")

# Shared with the backend; when set, every endpoint except /health needs it in X-Internal-Secret
AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET", "")
SECRET_HEADER = "X-Internal-Secret"

# MOCK_AI=1 answers every request with canned JSON: no Groq key, no network
MOCK_AI = os.getenv("MOCK_AI", "").lower() in ("1", "true", "yes")
# Each Groq call gets 30 s and one retry (the SDK retries on timeouts, 429 and 5xx), so the
# worst case stays within the backend's 60 s limit
GROQ_TIMEOUT_SECONDS = 30.0
GROQ_MAX_RETRIES = 1


@app.middleware("http")
async def require_shared_secret(request: Request, call_next):
    # /health stays open for the container healthcheck
    if AI_SHARED_SECRET and request.url.path != "/health":
        given = request.headers.get(SECRET_HEADER, "")
        # Constant-time comparison, so response timing does not leak how much of the secret matched
        if not hmac.compare_digest(given.encode("utf-8"), AI_SHARED_SECRET.encode("utf-8")):
            return JSONResponse(status_code=401, content={"detail": "Missing or invalid internal secret"})
    return await call_next(request)


client = None
if MOCK_AI:
    client = MockGroq()
elif OpenAI is not None:
    try:
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.getenv("GROQ_API_KEY", ""),
            timeout=GROQ_TIMEOUT_SECONDS,
            max_retries=GROQ_MAX_RETRIES,
        )
    except Exception:
        client = None

TEXT_MODEL = "openai/gpt-oss-20b"
VISION_MODEL = "qwen/qwen3.8-27b"


# --- Requests and responses of this service ---

class AnalyzeRequest(BaseModel):
    barcode: str
    name: str = "Unknown Product"
    ingredients: Union[str, List[str]] = ""
    lang: str = "el"
    # Set by the backend when the score comes from Nutri-Score data; the model must keep it and only explain it
    fixedScore: Optional[int] = None
    facts: str = ""


class AnalyzeResponse(BaseModel):
    barcode: str
    healthScore: int
    summary: str
    pros: List[str] = []
    cons: List[str] = []
    productName: str = ""
    origin: str = ""
    ingredients: List[str] = []
    nutrition: str = ""


class ImageAnalyzeResponse(BaseModel):
    fruitDetected: bool
    fruitName: str
    quality: str  # "good", "bad", "uncertain"
    confidence: float
    summary: str
    detectedObject: str = ""  # what the photo shows when it is not a fruit


class ProductIdentity(BaseModel):
    found: bool
    productName: str = ""
    brand: str = ""
    ingredients: str = ""


class SearchRequest(BaseModel):
    barcode: str


# --- What the models must answer; replies are validated before use ---

def _text(value) -> str:
    return "" if value is None else str(value).strip()


def _text_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    return value


class ModelReply(BaseModel):
    model_config = ConfigDict(extra="ignore")


class AnalysisReply(ModelReply):
    healthScore: int = 50
    summary: str = ""
    pros: List[str] = []
    cons: List[str] = []
    productName: str = ""
    origin: str = ""
    ingredients: List[str] = []
    nutrition: str = ""

    _texts = field_validator("summary", "productName", "origin", "nutrition", mode="before")(_text)
    _lists = field_validator("pros", "cons", "ingredients", mode="before")(_text_list)

    @field_validator("healthScore")
    @classmethod
    def within_range(cls, score: int) -> int:
        return max(0, min(100, score))


class LabelReply(ModelReply):
    readable: bool = False
    productName: str = ""
    brand: str = ""
    ingredients: str = ""

    _texts = field_validator("productName", "brand", "ingredients", mode="before")(_text)


class SearchReply(ModelReply):
    found: bool = False
    productName: str = ""
    brand: str = ""
    ingredients: str = ""

    _texts = field_validator("productName", "brand", "ingredients", mode="before")(_text)


class FruitReply(ModelReply):
    isFruit: bool = False
    fruitName: str = ""
    detectedObject: str = ""
    quality: str = "uncertain"
    confidence: float = 50
    summary: str = ""

    _texts = field_validator("fruitName", "detectedObject", "summary", mode="before")(_text)

    @field_validator("quality", mode="before")
    @classmethod
    def known_quality(cls, quality) -> str:
        quality = _text(quality).lower()
        return quality if quality in ("good", "bad", "uncertain") else "uncertain"

    @field_validator("confidence")
    @classmethod
    def within_range(cls, confidence: float) -> float:
        return max(0.0, min(100.0, confidence))


def _extract_json(text: str):
    """Returns the JSON object in the text, or None when there is none."""
    match = re.search(r"\{.*\}", text or "", re.DOTALL)
    return json.loads(match.group(0)) if match else None


def parse_reply(content: str, reply_model, json_required: bool = True):
    """Validates a model reply; an answer that cannot be used is a 502 (bad upstream), not a 500.

    json_required=False is for web search, whose plain-text answer without JSON means "not found".
    """
    try:
        data = _extract_json(content)
    except ValueError:
        raise HTTPException(status_code=502, detail="AI returned an answer that is not valid JSON")
    if data is None and not json_required:
        data = {}
    if not isinstance(data, dict):
        raise HTTPException(status_code=502, detail="AI returned an answer in an unexpected format")
    try:
        return reply_model.model_validate(data)
    except ValidationError:
        raise HTTPException(status_code=502, detail="AI returned an answer in an unexpected format")


def _require_client():
    if client is None:
        raise HTTPException(status_code=503, detail="AI client not available. Set GROQ_API_KEY or MOCK_AI=1.")


def _jpeg_data_uri(upload: UploadFile, max_side: int) -> str:
    image = Image.open(io.BytesIO(upload.file.read())).convert("RGB")
    # Downscaled to stay under Groq's base64 size limit
    image.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


# --- Prompts ---

SYSTEM_PROMPT = (
    "You are a nutrition and food safety expert. Analyze the given product ingredients. "
    "If no ingredients are given, estimate them from the product name. "
    "Calculate a health score from 0 to 100. Respond ONLY with valid JSON matching this schema: "
    '{"healthScore": <int 0-100>, "summary": "<short explanation>", '
    '"pros": ["..."], "cons": ["..."], "productName": "<product name>", '
    '"origin": "<country/origin>", "ingredients": ["..."], "nutrition": "<nutritional breakdown>"}. No extra text.'
)

FRUIT_QUALITY_PROMPT = (
    "You are a food quality inspector. Look at this image. If it shows a fruit, determine if the fruit is "
    "good (fresh, ripe, ready to eat) or bad (rotten, spoiled, overripe, moldy). "
    "If several fruits are visible, assess the main one. "
    "Respond ONLY with valid JSON: {\"isFruit\": <true if the image shows a fruit, else false>, "
    "\"fruitName\": \"<common English name of the fruit, lowercase, or empty>\", "
    "\"detectedObject\": \"<if it is not a fruit, the main object in a few English words, lowercase, else empty>\", "
    "\"quality\": \"good\" | \"bad\" | \"uncertain\", \"confidence\": <float 0-100>, \"summary\": \"<short explanation>\"}. No extra text."
)

LABEL_PROMPT = (
    "You read product packaging. From this photo, extract the product name, the brand and the full "
    "ingredient list exactly as printed (keep the original language). "
    "Respond ONLY with valid JSON: {\"readable\": <true if a product name or ingredient list is legible, else false>, "
    "\"productName\": \"...\", \"brand\": \"...\", \"ingredients\": \"<comma-separated ingredients or empty>\"}. No extra text."
)

SEARCH_PROMPT = (
    "Search the web for the retail product with barcode (EAN/UPC) {barcode}. Only report a product if a source "
    "explicitly ties it to this exact barcode. Then reply with ONLY a JSON object, no other text: "
    "{{\"found\": <true/false>, \"productName\": \"...\", \"brand\": \"...\", "
    "\"ingredients\": \"<comma-separated ingredients if listed, else empty>\"}}"
)


# --- Endpoints. Sync on purpose: FastAPI runs them in a thread pool, so a slow model call
# never blocks the event loop ---

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    _require_client()
    ingredients = req.ingredients
    if isinstance(ingredients, list):
        ingredients = ", ".join(ingredients)
    lang_instr = "Respond in Greek." if req.lang == "el" else "Respond in English."
    user_msg = f"Product: {req.name}\nBarcode: {req.barcode}\nIngredients: {ingredients}\n"
    if req.facts:
        user_msg += f"Open Food Facts data: {req.facts}\n"
    if req.fixedScore is not None:
        user_msg += (f"The health score is fixed at {req.fixedScore}, calculated from that data. "
                     "Use exactly this value as healthScore and explain it; do not change it.\n")
    user_msg += lang_instr
    completion = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=4096,
        # gpt-oss is a reasoning model; keep reasoning short so it leaves room for the JSON answer
        extra_body={"reasoning_effort": "low"},
    )
    reply = parse_reply(completion.choices[0].message.content, AnalysisReply)
    return AnalyzeResponse(
        barcode=req.barcode,
        # A fixed score is never overridden by the model
        healthScore=req.fixedScore if req.fixedScore is not None else reply.healthScore,
        summary=reply.summary,
        pros=reply.pros,
        cons=reply.cons,
        productName=reply.productName or req.name,
        origin=reply.origin,
        ingredients=reply.ingredients,
        nutrition=reply.nutrition,
    )


@app.post("/read-label", response_model=ProductIdentity)
def read_label(file: UploadFile = File(...)):
    _require_client()
    # Labels need more resolution than fruit photos for small print
    data_uri = _jpeg_data_uri(file, 1600)
    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {"role": "system", "content": LABEL_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Read this product label:"},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=2048,
    )
    reply = parse_reply(completion.choices[0].message.content, LabelReply)
    return ProductIdentity(
        found=reply.readable and bool(reply.productName or reply.ingredients),
        productName=reply.productName,
        brand=reply.brand,
        ingredients=reply.ingredients,
    )


@app.post("/search-product", response_model=ProductIdentity)
def search_product(req: SearchRequest):
    _require_client()
    # Groq's built-in browser search (free tier); slow, so only used after every product database misses
    completion = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": SEARCH_PROMPT.format(barcode=req.barcode)}],
        tools=[{"type": "browser_search"}],
        temperature=0.1,
        max_tokens=4096,
        extra_body={"reasoning_effort": "low"},
    )
    reply = parse_reply(completion.choices[0].message.content, SearchReply, json_required=False)
    return ProductIdentity(
        found=reply.found and bool(reply.productName),
        productName=reply.productName,
        brand=reply.brand,
        ingredients=reply.ingredients,
    )


@app.post("/analyze-image", response_model=ImageAnalyzeResponse)
def analyze_image(file: UploadFile = File(...)):
    _require_client()
    data_uri = _jpeg_data_uri(file, 1024)
    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {"role": "system", "content": FRUIT_QUALITY_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Assess this fruit quality:"},
                    {"type": "image_url", "image_url": {"url": data_uri}},
                ],
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=512,
    )
    reply = parse_reply(completion.choices[0].message.content, FruitReply)
    if not reply.isFruit or not reply.fruitName:
        detected = reply.detectedObject.lower()
        return ImageAnalyzeResponse(
            fruitDetected=False,
            fruitName="",
            quality="uncertain",
            confidence=0.0,
            summary=f"Not a fruit. Detected: {detected}" if detected else "No fruit detected in the image.",
            detectedObject=detected,
        )
    return ImageAnalyzeResponse(
        fruitDetected=True,
        fruitName=reply.fruitName.lower(),
        quality=reply.quality,
        confidence=reply.confidence,
        summary=reply.summary,
    )


@app.get("/health")
def health():
    return {"status": "ok", "mock": MOCK_AI}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
