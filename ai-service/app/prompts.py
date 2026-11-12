"""What each model is told. The mock client recognizes the system prompts by their wording."""

ANALYSIS = (
    "You are a nutrition and food safety expert. Analyze the given product ingredients. "
    "If no ingredients are given, estimate them from the product name. "
    "Calculate a health score from 0 to 100. Respond ONLY with valid JSON matching this schema: "
    '{"healthScore": <int 0-100>, "summary": "<short explanation>", '
    '"pros": ["..."], "cons": ["..."], "productName": "<product name>", '
    '"origin": "<country/origin>", "ingredients": ["..."], "nutrition": "<nutritional breakdown>"}. No extra text.'
)

FRUIT_QUALITY = (
    "You are a food quality inspector. Look at this image. If it shows a fruit, determine if the fruit is "
    "good (fresh, ripe, ready to eat) or bad (rotten, spoiled, overripe, moldy). "
    "If several fruits are visible, assess the main one. "
    "Respond ONLY with valid JSON: {\"isFruit\": <true if the image shows a fruit, else false>, "
    "\"fruitName\": \"<common English name of the fruit, lowercase, or empty>\", "
    "\"detectedObject\": \"<if it is not a fruit, the main object in a few English words, lowercase, else empty>\", "
    "\"quality\": \"good\" | \"bad\" | \"uncertain\", \"confidence\": <float 0-100>, \"summary\": \"<short explanation>\"}. No extra text."
)

LABEL = (
    "You read product packaging. From this photo, extract the product name, the brand and the full "
    "ingredient list exactly as printed (keep the original language). "
    "Respond ONLY with valid JSON: {\"readable\": <true if a product name or ingredient list is legible, else false>, "
    "\"productName\": \"...\", \"brand\": \"...\", \"ingredients\": \"<comma-separated ingredients or empty>\"}. No extra text."
)

SEARCH = (
    "Search the web for the retail product with barcode (EAN/UPC) {barcode}. Only report a product if a source "
    "explicitly ties it to this exact barcode. Then reply with ONLY a JSON object, no other text: "
    "{{\"found\": <true/false>, \"productName\": \"...\", \"brand\": \"...\", "
    "\"ingredients\": \"<comma-separated ingredients if listed, else empty>\"}}"
)


def analysis_request(name: str, barcode: str, ingredients: str, lang: str, facts: str, fixed_score) -> str:
    """The user message for a product analysis."""
    message = f"Product: {name}\nBarcode: {barcode}\nIngredients: {ingredients}\n"
    if facts:
        message += f"Open Food Facts data: {facts}\n"
    if fixed_score is not None:
        message += (f"The health score is fixed at {fixed_score}, calculated from that data. "
                    "Use exactly this value as healthScore and explain it; do not change it.\n")
    return message + ("Respond in Greek." if lang == "el" else "Respond in English.")
