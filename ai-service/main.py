import os
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Union
from openai import OpenAI

app = FastAPI(title="Health Scan AI Service")

client = OpenAI(
    base_url="https://api.groq.com/openai/v1",
    api_key=os.getenv("GROQ_API_KEY", ""),
)

MODEL = "openai/gpt-oss-20b"

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

SYSTEM_PROMPT = (
    "You are a nutrition and food safety expert. Analyze the given product ingredients. "
    "Calculate a health score from 0 to 100. Respond ONLY with valid JSON matching this schema: "
    '{"healthScore": <int 0-100>, "summary": "<short explanation in Greek>", '
    '"pros": ["..."], "cons": ["..."], "productName": "<product name>", '
    '"origin": "<country/origin>", "ingredients": ["..."], "nutrition": "<nutritional breakdown>"}. No extra text.'
)

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    ingredients = req.ingredients
    if isinstance(ingredients, list):
        ingredients = ", ".join(ingredients)
    lang_instr = "Respond in Greek." if req.lang == "el" else "Respond in English."
    user_msg = f"Product: {req.name}\nBarcode: {req.barcode}\nIngredients: {ingredients}\n{lang_instr}"
    completion = client.chat.completions.create(
        model=MODEL,
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

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
