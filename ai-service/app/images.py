"""Photos are re-encoded as small JPEGs before they go to the vision model."""
import base64
import io

from fastapi import HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from PIL import Image, UnidentifiedImageError


def jpeg_data_uri(raw: bytes, max_side: int) -> str:
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    # Downscaled to stay under Groq's base64 size limit
    image.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=90)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")


async def upload_to_data_uri(upload: UploadFile, max_side: int) -> str:
    """Decoding and resizing are CPU work, so they run in a worker thread, off the event loop."""
    raw = await upload.read()
    try:
        return await run_in_threadpool(jpeg_data_uri, raw, max_side)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise HTTPException(status_code=400, detail="The file is not a readable image")
