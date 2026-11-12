"""The endpoints. They are async: a model call waits without holding a thread, so one slow
answer never holds up the others or the health check."""
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile

from app import config, prompts
from app.images import upload_to_data_uri
from app.llm import complete, get_client
from app.schemas import (AnalysisReply, AnalyzeRequest, AnalyzeResponse, FruitReply, ImageAnalyzeResponse,
                         LabelReply, ProductIdentity, SearchReply, SearchRequest, parse_reply)

router = APIRouter()
Client = Annotated[Any, Depends(get_client)]


def _vision_messages(system: str, instruction: str, data_uri: str) -> list:
    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": instruction},
                {"type": "image_url", "image_url": {"url": data_uri}},
            ],
        },
    ]


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, client: Client):
    ingredients = ", ".join(req.ingredients) if isinstance(req.ingredients, list) else req.ingredients
    content = await complete(
        client,
        model=config.TEXT_MODEL,
        messages=[
            {"role": "system", "content": prompts.ANALYSIS},
            {"role": "user", "content": prompts.analysis_request(
                req.name, req.barcode, ingredients, req.lang, req.facts, req.fixedScore)},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=4096,
        # gpt-oss is a reasoning model; keep reasoning short so it leaves room for the JSON answer
        extra_body={"reasoning_effort": "low"},
    )
    reply = parse_reply(content, AnalysisReply)
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


@router.post("/read-label", response_model=ProductIdentity)
async def read_label(client: Client, file: UploadFile = File(...)):
    # Labels need more resolution than fruit photos for small print
    data_uri = await upload_to_data_uri(file, 1600)
    content = await complete(
        client,
        model=config.VISION_MODEL,
        messages=_vision_messages(prompts.LABEL, "Read this product label:", data_uri),
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=2048,
    )
    reply = parse_reply(content, LabelReply)
    return ProductIdentity(
        found=reply.readable and bool(reply.productName or reply.ingredients),
        productName=reply.productName,
        brand=reply.brand,
        ingredients=reply.ingredients,
    )


@router.post("/search-product", response_model=ProductIdentity)
async def search_product(req: SearchRequest, client: Client):
    # Groq's built-in browser search (free tier); slow, so only used after every product database misses
    content = await complete(
        client,
        model=config.TEXT_MODEL,
        messages=[{"role": "user", "content": prompts.SEARCH.format(barcode=req.barcode)}],
        tools=[{"type": "browser_search"}],
        temperature=0.1,
        max_tokens=4096,
        extra_body={"reasoning_effort": "low"},
    )
    reply = parse_reply(content, SearchReply, json_required=False)
    return ProductIdentity(
        found=reply.found and bool(reply.productName),
        productName=reply.productName,
        brand=reply.brand,
        ingredients=reply.ingredients,
    )


@router.post("/analyze-image", response_model=ImageAnalyzeResponse)
async def analyze_image(client: Client, file: UploadFile = File(...)):
    data_uri = await upload_to_data_uri(file, 1024)
    content = await complete(
        client,
        model=config.VISION_MODEL,
        messages=_vision_messages(prompts.FRUIT_QUALITY, "Assess this fruit quality:", data_uri),
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=512,
    )
    reply = parse_reply(content, FruitReply)
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


@router.get("/health")
async def health():
    return {"status": "ok", "mock": config.MOCK_AI}
