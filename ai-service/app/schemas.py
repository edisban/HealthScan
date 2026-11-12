"""Requests and responses of this service, and what the models must answer."""
import json
import re
from typing import List, Optional, Union

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator


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
