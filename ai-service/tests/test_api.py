import base64
import inspect
import io
import json
import time
from concurrent.futures import ThreadPoolExecutor

import httpx
import openai
import pytest
from PIL import Image

from app import config, routes
from app.llm import make_client
from app.mock_ai import MockGroq
from conftest import jpeg


def sent_image_size(request):
    data_uri = request["messages"][1]["content"][1]["image_url"]["url"]
    encoded = data_uri.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(encoded))).size


def test_health(api):
    assert api.get("/health").json() == {"status": "ok", "mock": False}


# --- The model client ---

def test_groq_calls_have_a_timeout_and_one_retry():
    client = make_client(mock=False, api_key="test-key")

    assert isinstance(client, openai.AsyncOpenAI)
    assert client.timeout == config.GROQ_TIMEOUT_SECONDS
    assert client.max_retries == 1


def test_without_a_key_there_is_no_client():
    assert make_client(mock=False, api_key="") is None


def test_mock_mode_needs_no_key():
    assert isinstance(make_client(mock=True, api_key=""), MockGroq)


@pytest.mark.parametrize("endpoint", [routes.analyze, routes.read_label, routes.search_product, routes.analyze_image])
def test_model_calls_do_not_hold_a_thread(endpoint):
    assert inspect.iscoroutinefunction(endpoint)


def test_health_answers_while_a_model_call_is_slow(api, groq):
    groq.reply = '{"healthScore": 50}'
    groq.delay = 1.0

    with ThreadPoolExecutor(max_workers=1) as pool:
        slow = pool.submit(api.post, "/analyze", json={"barcode": "1"})
        time.sleep(0.2)  # the model call is now waiting
        start = time.monotonic()
        health = api.get("/health")
        took = time.monotonic() - start

        assert health.status_code == 200
        assert took < 0.5
        assert slow.result().status_code == 200


def test_slow_model_calls_wait_together(api, groq):
    groq.reply = '{"healthScore": 50}'
    groq.delay = 0.5

    start = time.monotonic()
    with ThreadPoolExecutor(max_workers=4) as pool:
        replies = list(pool.map(lambda _: api.post("/analyze", json={"barcode": "1"}), range(4)))
    took = time.monotonic() - start

    assert all(reply.status_code == 200 for reply in replies)
    # One after the other would take 2 s
    assert took < 1.5


# --- Groq failures ---

def test_model_timeout_is_a_gateway_timeout(api, groq):
    groq.error = openai.APITimeoutError(request=httpx.Request("POST", "https://api.groq.com"))

    assert api.post("/analyze", json={"barcode": "1"}).status_code == 504


def test_model_outage_is_a_bad_gateway(api, groq):
    groq.error = openai.APIConnectionError(request=httpx.Request("POST", "https://api.groq.com"))

    assert api.post("/analyze", json={"barcode": "1"}).status_code == 502


def test_file_that_is_not_an_image_is_a_bad_request(api, groq):
    response = api.post("/analyze-image", files={"file": ("photo.jpg", b"not an image", "image/jpeg")})

    assert response.status_code == 400
    assert groq.requests == []


# --- Model replies are validated before use ---

def test_list_given_as_a_single_string_is_accepted(api, groq):
    groq.reply = '{"healthScore": 50, "summary": "s", "pros": "High protein", "cons": null}'

    body = api.post("/analyze", json={"barcode": "1"}).json()

    assert body["pros"] == ["High protein"]
    assert body["cons"] == []


def test_score_out_of_range_is_clamped(api, groq):
    groq.reply = '{"healthScore": 150, "summary": ""}'

    assert api.post("/analyze", json={"barcode": "1"}).json()["healthScore"] == 100


@pytest.mark.parametrize("reply", ['{"healthScore": "very healthy"}', "not json at all {", '["a", "list"]'])
def test_unusable_reply_is_a_bad_gateway_not_a_crash(api, groq, reply):
    groq.reply = reply

    response = api.post("/analyze", json={"barcode": "1"})

    assert response.status_code == 502


def test_unknown_fruit_quality_becomes_uncertain(api, groq):
    groq.reply = '{"isFruit": true, "fruitName": "kiwi", "quality": "excellent", "confidence": 140}'

    body = api.post("/analyze-image", files=jpeg()).json()

    assert body["quality"] == "uncertain"
    assert body["confidence"] == 100.0


def test_null_label_fields_are_empty_strings(api, groq):
    groq.reply = '{"readable": true, "productName": "Yogurt", "brand": null, "ingredients": null}'

    body = api.post("/read-label", files=jpeg()).json()

    assert body == {"found": True, "productName": "Yogurt", "brand": "", "ingredients": ""}


# --- MOCK_AI mode ---

@pytest.fixture
def mock_ai(use_client):
    use_client(MockGroq())


def test_mock_mode_scores_without_groq(api, mock_ai):
    body = api.post("/analyze", json={"barcode": "1", "fixedScore": 39}).json()

    assert body["healthScore"] == 39
    assert body["summary"].startswith("Mock analysis")


def test_mock_mode_answers_every_endpoint(api, mock_ai):
    assert api.post("/analyze-image", files=jpeg()).json()["fruitName"] == "apple"
    assert api.post("/read-label", files=jpeg()).json()["productName"] == "Mock label product"
    assert api.post("/search-product", json={"barcode": "1"}).json()["found"] is False


def test_mock_mode_is_made_at_start_up(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app

    monkeypatch.setattr(config, "MOCK_AI", True)
    with TestClient(app) as client:
        assert client.post("/analyze", json={"barcode": "1"}).json()["healthScore"] == 62
        assert client.get("/health").json()["mock"] is True


# --- Shared secret ---

def test_missing_secret_is_unauthorized(api, groq, shared_secret):
    response = api.post("/analyze", json={"barcode": "1"})

    assert response.status_code == 401
    assert groq.requests == []


def test_wrong_secret_is_unauthorized(api, groq, shared_secret):
    response = api.post("/analyze", json={"barcode": "1"}, headers={config.SECRET_HEADER: "s3cre7"})

    assert response.status_code == 401
    assert groq.requests == []


def test_every_model_endpoint_needs_the_secret(api, groq, shared_secret):
    assert api.post("/read-label", files=jpeg()).status_code == 401
    assert api.post("/analyze-image", files=jpeg()).status_code == 401
    assert api.post("/search-product", json={"barcode": "1"}).status_code == 401


def test_correct_secret_is_accepted(api, groq, shared_secret):
    groq.reply = '{"healthScore": 50, "summary": ""}'

    response = api.post("/analyze", json={"barcode": "1"}, headers={config.SECRET_HEADER: shared_secret})

    assert response.status_code == 200


def test_health_stays_open_for_the_container_healthcheck(api, shared_secret):
    assert api.get("/health").status_code == 200


# --- /analyze ---

def test_analyze_returns_the_model_fields(api, groq):
    groq.reply = json.dumps({
        "healthScore": 72, "summary": "Fine", "pros": ["Protein"], "cons": ["Sugar"],
        "productName": "Yogurt", "origin": "Greece", "ingredients": ["milk"], "nutrition": "100 kcal",
    })

    body = api.post("/analyze", json={"barcode": "1", "name": "Yogurt", "lang": "en"}).json()

    assert body["healthScore"] == 72
    assert body["pros"] == ["Protein"]
    assert body["origin"] == "Greece"


def test_analyze_uses_json_mode(api, groq):
    groq.reply = '{"healthScore": 50, "summary": ""}'

    api.post("/analyze", json={"barcode": "1"})

    assert groq.requests[0]["response_format"] == {"type": "json_object"}


@pytest.mark.parametrize("lang, instruction", [("el", "Respond in Greek."), ("en", "Respond in English.")])
def test_analyze_asks_for_the_requested_language(api, groq, lang, instruction):
    groq.reply = '{"healthScore": 50, "summary": ""}'

    api.post("/analyze", json={"barcode": "1", "lang": lang})

    assert instruction in groq.requests[0]["messages"][1]["content"]


def test_analyze_accepts_an_ingredient_list(api, groq):
    groq.reply = '{"healthScore": 50, "summary": ""}'

    api.post("/analyze", json={"barcode": "1", "ingredients": ["milk", "sugar"]})

    assert "Ingredients: milk, sugar" in groq.requests[0]["messages"][1]["content"]


def test_fixed_score_is_kept_even_if_the_model_returns_another(api, groq):
    groq.reply = '{"healthScore": 80, "summary": "Explained"}'

    body = api.post("/analyze", json={"barcode": "1", "fixedScore": 39, "facts": "Nutri-Score C, NOVA group 4"}).json()

    assert body["healthScore"] == 39
    assert body["summary"] == "Explained"


def test_fixed_score_and_facts_are_given_to_the_model(api, groq):
    groq.reply = '{"healthScore": 39, "summary": ""}'

    api.post("/analyze", json={"barcode": "1", "fixedScore": 39, "facts": "Nutri-Score C, NOVA group 4"})

    prompt = groq.requests[0]["messages"][1]["content"]
    assert "Open Food Facts data: Nutri-Score C, NOVA group 4" in prompt
    assert "fixed at 39" in prompt


def test_without_a_fixed_score_the_model_scores(api, groq):
    groq.reply = '{"healthScore": 64, "summary": ""}'

    body = api.post("/analyze", json={"barcode": "1"}).json()

    assert body["healthScore"] == 64
    assert "fixed at" not in groq.requests[0]["messages"][1]["content"]


def test_analyze_without_a_key_is_unavailable(api):
    assert api.post("/analyze", json={"barcode": "1"}).status_code == 503


# --- /read-label ---

def test_read_label_found(api, groq):
    groq.reply = '{"readable": true, "productName": " Yogurt ", "brand": "Fage", "ingredients": "milk"}'

    body = api.post("/read-label", files=jpeg()).json()

    assert body == {"found": True, "productName": "Yogurt", "brand": "Fage", "ingredients": "milk"}


def test_read_label_unreadable(api, groq):
    groq.reply = '{"readable": false, "productName": "Blurry guess"}'

    assert api.post("/read-label", files=jpeg()).json()["found"] is False


def test_read_label_readable_but_empty(api, groq):
    groq.reply = '{"readable": true, "productName": "", "ingredients": ""}'

    assert api.post("/read-label", files=jpeg()).json()["found"] is False


def test_read_label_keeps_small_print_up_to_1600_px(api, groq):
    groq.reply = '{"readable": false}'

    api.post("/read-label", files=jpeg((3000, 3000)))

    assert sent_image_size(groq.requests[0]) == (1600, 1600)


# --- /search-product ---

def test_search_extracts_json_from_prose(api, groq):
    groq.reply = 'I found it. {"found": true, "productName": "Yogurt", "brand": "Fage"} Hope that helps.'

    body = api.post("/search-product", json={"barcode": "1"}).json()

    assert body["found"] is True
    assert body["productName"] == "Yogurt"


def test_search_uses_the_browser_tool_and_the_barcode(api, groq):
    groq.reply = '{"found": false}'

    api.post("/search-product", json={"barcode": "5201234567890"})

    assert groq.requests[0]["tools"] == [{"type": "browser_search"}]
    assert "5201234567890" in groq.requests[0]["messages"][0]["content"]


def test_search_reply_without_json_is_not_found(api, groq):
    groq.reply = "I could not find that product."

    assert api.post("/search-product", json={"barcode": "1"}).json()["found"] is False


def test_search_match_without_a_name_is_not_found(api, groq):
    groq.reply = '{"found": true, "productName": ""}'

    assert api.post("/search-product", json={"barcode": "1"}).json()["found"] is False


# --- /analyze-image ---

def test_fruit_is_identified_and_rated(api, groq):
    groq.reply = '{"isFruit": true, "fruitName": "Kiwi", "quality": "good", "confidence": 91, "summary": "Fresh"}'

    body = api.post("/analyze-image", files=jpeg()).json()

    assert body == {
        "fruitDetected": True, "fruitName": "kiwi", "quality": "good", "confidence": 91.0,
        "summary": "Fresh", "detectedObject": "",
    }


def test_fruit_defaults_to_uncertain(api, groq):
    groq.reply = '{"isFruit": true, "fruitName": "kiwi"}'

    assert api.post("/analyze-image", files=jpeg()).json()["quality"] == "uncertain"


@pytest.mark.parametrize("reply", [
    '{"isFruit": false, "fruitName": "kiwi"}',
    '{"isFruit": true, "fruitName": ""}',
])
def test_no_fruit(api, groq, reply):
    groq.reply = reply

    body = api.post("/analyze-image", files=jpeg()).json()

    assert body["fruitDetected"] is False
    assert body["fruitName"] == ""
    assert body["confidence"] == 0.0


def test_non_fruit_names_what_the_photo_shows(api, groq):
    groq.reply = '{"isFruit": false, "fruitName": "", "detectedObject": " Cell Phone "}'

    body = api.post("/analyze-image", files=jpeg()).json()

    assert body["fruitDetected"] is False
    assert body["detectedObject"] == "cell phone"
    assert body["summary"] == "Not a fruit. Detected: cell phone"


def test_non_fruit_without_an_object_keeps_the_plain_message(api, groq):
    groq.reply = '{"isFruit": false, "detectedObject": ""}'

    body = api.post("/analyze-image", files=jpeg()).json()

    assert body["detectedObject"] == ""
    assert body["summary"] == "No fruit detected in the image."


def test_fruit_prompt_asks_for_the_detected_object(api, groq):
    groq.reply = '{"isFruit": false}'

    api.post("/analyze-image", files=jpeg())

    assert "detectedObject" in groq.requests[0]["messages"][0]["content"]


def test_fruit_photo_is_reduced_to_1024_px(api, groq):
    groq.reply = '{"isFruit": false}'

    api.post("/analyze-image", files=jpeg((3000, 3000)))

    assert sent_image_size(groq.requests[0]) == (1024, 1024)


def test_fruit_without_a_key_is_unavailable(api):
    assert api.post("/analyze-image", files=jpeg()).status_code == 503
