import hmac
import io
import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Union
from PIL import Image

try:
    from openai import OpenAI
except Exception:
    OpenAI = None

app = FastAPI(title="Health Scan AI Service")

# Shared with the backend; when set, every endpoint except /health needs it in X-Internal-Secret
AI_SHARED_SECRET = os.getenv("AI_SHARED_SECRET", "")
SECRET_HEADER = "X-Internal-Secret"


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
if OpenAI is not None:
    try:
        client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.getenv("GROQ_API_KEY", ""),
        )
    except Exception:
        client = None

TEXT_MODEL = "openai/gpt-oss-20b"
VISION_MODEL = "qwen/qwen3.8-27b"


class AnalyzeRequest(BaseModel):
    barcode: str
    name: str = "Unknown Product"
    ingredients: Union[str, List[str]] = ""
    lang: str = "el"


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


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    if client is None:
        raise HTTPException(status_code=503, detail="OpenAI client not available. Install openai package and set GROQ_API_KEY.")
    ingredients = req.ingredients
    if isinstance(ingredients, list):
        ingredients = ", ".join(ingredients)
    lang_instr = "Respond in Greek." if req.lang == "el" else "Respond in English."
    user_msg = f"Product: {req.name}\nBarcode: {req.barcode}\nIngredients: {ingredients}\n{lang_instr}"
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
    import json
    data = json.loads(completion.choices[0].message.content)
    return AnalyzeResponse(
        barcode=req.barcode,
        healthScore=int(data.get("healthScore", 50)),
        summary=data.get("summary", ""),
        pros=data.get("pros", []),
        cons=data.get("cons", []),
        productName=data.get("productName", req.name),
        origin=data.get("origin", ""),
        ingredients=data.get("ingredients", []),
        nutrition=data.get("nutrition", ""),
    )


class ProductIdentity(BaseModel):
    found: bool
    productName: str = ""
    brand: str = ""
    ingredients: str = ""


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


def _extract_json(text: str) -> dict:
    import json
    import re
    match = re.search(r"\{.*\}", text or "", re.DOTALL)
    return json.loads(match.group(0)) if match else {}


# Sync endpoints: FastAPI runs them in a thread pool, so a slow Groq call doesn't block the event loop
@app.post("/read-label", response_model=ProductIdentity)
def read_label(file: UploadFile = File(...)):
    if client is None:
        raise HTTPException(status_code=503, detail="AI client not available. Set GROQ_API_KEY.")
    image = Image.open(io.BytesIO(file.file.read())).convert("RGB")
    # Labels need more resolution than fruit photos for small print, but stay under Groq's size limit
    image.thumbnail((1600, 1600))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    import base64
    data_uri = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
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
    data = _extract_json(completion.choices[0].message.content)
    name = str(data.get("productName") or "").strip()
    ingredients = str(data.get("ingredients") or "").strip()
    return ProductIdentity(
        found=bool(data.get("readable")) and bool(name or ingredients),
        productName=name,
        brand=str(data.get("brand") or "").strip(),
        ingredients=ingredients,
    )


class SearchRequest(BaseModel):
    barcode: str


@app.post("/search-product", response_model=ProductIdentity)
def search_product(req: SearchRequest):
    if client is None:
        raise HTTPException(status_code=503, detail="AI client not available. Set GROQ_API_KEY.")
    # Groq's built-in browser search (free tier); slow, so only used after every product database misses
    completion = client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[{"role": "user", "content": SEARCH_PROMPT.format(barcode=req.barcode)}],
        tools=[{"type": "browser_search"}],
        temperature=0.1,
        max_tokens=4096,
        extra_body={"reasoning_effort": "low"},
    )
    data = _extract_json(completion.choices[0].message.content)
    name = str(data.get("productName") or "").strip()
    return ProductIdentity(
        found=bool(data.get("found")) and bool(name),
        productName=name,
        brand=str(data.get("brand") or "").strip(),
        ingredients=str(data.get("ingredients") or "").strip(),
    )


@app.post("/analyze-image", response_model=ImageAnalyzeResponse)
def analyze_image(file: UploadFile = File(...)):
    if client is None:
        raise HTTPException(status_code=503, detail="AI client not available. Set GROQ_API_KEY.")
    image = Image.open(io.BytesIO(file.file.read())).convert("RGB")

    # Downscaled to stay under Groq's base64 size limit
    image.thumbnail((1024, 1024))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    import base64
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    data_uri = f"data:image/jpeg;base64,{b64}"

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
    import json
    data = json.loads(completion.choices[0].message.content)
    if not data.get("isFruit") or not data.get("fruitName"):
        detected = str(data.get("detectedObject") or "").strip().lower()
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
        fruitName=str(data["fruitName"]).lower(),
        quality=data.get("quality", "uncertain"),
        confidence=float(data.get("confidence", 50)),
        summary=data.get("summary", ""),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
