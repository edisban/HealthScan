"""Deterministic stand-in for the Groq client, used when MOCK_AI=1.

No network and no API key: every call returns the same canned JSON, so the whole stack
can run for demos, screenshots and end-to-end tests without spending model quota.
"""
import json
from types import SimpleNamespace

ANALYSIS = {
    "healthScore": 62,
    "summary": "Mock analysis: MOCK_AI is on, so this text does not come from a real model.",
    "pros": ["Mock positive point"],
    "cons": ["Mock negative point"],
    "origin": "",
    "ingredients": [],
    "nutrition": "",
}
LABEL = {"readable": True, "productName": "Mock label product", "brand": "", "ingredients": "water, sugar"}
SEARCH = {"found": False}
FRUIT = {"isFruit": True, "fruitName": "apple", "quality": "good", "confidence": 90,
         "summary": "Mock result: MOCK_AI is on, so this is not a real assessment."}


class MockGroq:
    def __init__(self):
        self.requests = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    def _create(self, **kwargs):
        self.requests.append(kwargs)
        content = json.dumps(self._reply(kwargs))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    @staticmethod
    def _reply(kwargs):
        if kwargs.get("tools"):
            return SEARCH
        first = kwargs["messages"][0]
        system = first["content"] if first["role"] == "system" else ""
        # Matched on wording from the system prompts in main.py
        if "food quality inspector" in system:
            return FRUIT
        if "read product packaging" in system:
            return LABEL
        return ANALYSIS
