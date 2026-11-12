import base64
import inspect
import io
import json
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import main


class FakeGroq:
    """Stands in for the OpenAI client: records each request and returns a canned reply."""

    def __init__(self):
        self.reply = "{}"
        self.requests = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.requests.append(kwargs)
        message = SimpleNamespace(content=self.reply)
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


@pytest.fixture
def groq(monkeypatch):
    fake = FakeGroq()
    monkeypatch.setattr(main, "client", fake)
    return fake


@pytest.fixture
def no_groq(monkeypatch):
    monkeypatch.setattr(main, "client", None)


@pytest.fixture
def api():
    return TestClient(main.app)


def jpeg(size=(64, 64)):
    buf = io.BytesIO()
    Image.new("RGB", size, (200, 30, 30)).save(buf, format="JPEG")
    return {"file": ("photo.jpg", buf.getvalue(), "image/jpeg")}


def sent_image_size(request):
    data_uri = request["messages"][1]["content"][1]["image_url"]["url"]
    encoded = data_uri.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(encoded))).size


def test_health(api):
    assert api.get("/health").json() == {"status": "ok"}


@pytest.fixture
def shared_secret(monkeypatch):
    monkeypatch.setattr(main, "AI_SHARED_SECRET", "s3cret")
    return "s3cret"


def test_missing_secret_is_unauthorized(api, groq, shared_secret):
    response = api.post("/analyze", json={"barcode": "1"})

    assert response.status_code == 401
    assert groq.requests == []


def test_wrong_secret_is_unauthorized(api, groq, shared_secret):
    response = api.post("/analyze", json={"barcode": "1"}, headers={main.SECRET_HEADER: "s3cre7"})

    assert response.status_code == 401
    assert groq.requests == []


def test_every_model_endpoint_needs_the_secret(api, groq, shared_secret):
    assert api.post("/read-label", files=jpeg()).status_code == 401
    assert api.post("/analyze-image", files=jpeg()).status_code == 401
    assert api.post("/search-product", json={"barcode": "1"}).status_code == 401


def test_correct_secret_is_accepted(api, groq, shared_secret):
    groq.reply = '{"healthScore": 50, "summary": ""}'

    response = api.post("/analyze", json={"barcode": "1"}, headers={main.SECRET_HEADER: shared_secret})

    assert response.status_code == 200


def test_health_stays_open_for_the_container_healthcheck(api, shared_secret):
    assert api.get("/health").status_code == 200


@pytest.mark.parametrize("endpoint", [main.read_label, main.analyze_image, main.search_product, main.analyze])
def test_model_calls_stay_off_the_event_loop(endpoint):
    assert not inspect.iscoroutinefunction(endpoint)


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


def test_analyze_without_a_key_is_unavailable(api, no_groq):
    assert api.post("/analyze", json={"barcode": "1"}).status_code == 503


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


def test_fruit_without_a_key_is_unavailable(api, no_groq):
    assert api.post("/analyze-image", files=jpeg()).status_code == 503
