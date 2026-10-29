import io
import os
from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List, Union
from PIL import Image
from openai import OpenAI

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

app = FastAPI(title="Health Scan AI Service")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY", ""),
)

TEXT_MODEL = "openai/gpt-oss-20b"
VISION_MODEL = "llama-3.2-11b-vision-preview"

# Fruit-related COCO classes we care about
FRUIT_CLASSES = {"banana", "apple", "orange"}

# Load YOLO lazily so the service starts even without the model downloaded yet
_yolo = None


def get_yolo():
    global _yolo
    if _yolo is None and YOLO is not None:
        _yolo = YOLO("yolov8n.pt")
    return _yolo


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


SYSTEM_PROMPT = (
    "You are a nutrition and food safety expert. Analyze the given product ingredients. "
    "Calculate a health score from 0 to 100. Respond ONLY with valid JSON matching this schema: "
    '{"healthScore": <int 0-100>, "summary": "<short explanation in Greek>", '
    '"pros": ["..."], "cons": ["..."], "productName": "<product name>", '
    '"origin": "<country/origin>", "ingredients": ["..."], "nutrition": "<nutritional breakdown>"}. No extra text.'
)

FRUIT_QUALITY_PROMPT = (
    "You are a food quality inspector. Look at this fruit image and determine if the fruit is "
    "good (fresh, ripe, ready to eat) or bad (rotten, spoiled, overripe, moldy). "
    "Respond ONLY with valid JSON: {\"quality\": \"good\" | \"bad\" | \"uncertain\", \"confidence\": <float 0-100>, \"summary\": \"<short explanation>\"}. No extra text."
)


@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
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
        max_tokens=1024,
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


@app.post("/analyze-image", response_model=ImageAnalyzeResponse)
async def analyze_image(file: UploadFile = File(...)):
    contents = await file.read()
    image = Image.open(io.BytesIO(contents)).convert("RGB")

    # Detect fruit with YOLO
    model = get_yolo()
    fruit_name = None
    fruit_box = None
    if model is not None:
        results = model(image)
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                name = model.names[cls].lower()
                if name in FRUIT_CLASSES:
                    fruit_name = name
                    fruit_box = box.xyxy[0].tolist()
                    break
            if fruit_name:
                break

    if not fruit_name:
        return ImageAnalyzeResponse(
            fruitDetected=False,
            fruitName="",
            quality="uncertain",
            confidence=0.0,
            summary="No fruit detected in the image.",
        )

    # Crop the fruit region for quality assessment
    if fruit_box:
        x1, y1, x2, y2 = [int(v) for v in fruit_box]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(image.width, x2), min(image.height, y2)
        crop = image.crop((x1, y1, x2, y2))
    else:
        crop = image

    # Convert crop to base85-ish data URI for Groq vision
    buf = io.BytesIO()
    crop.save(buf, format="PNG")
    import base64
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64}"

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
    return ImageAnalyzeResponse(
        fruitDetected=True,
        fruitName=fruit_name,
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
