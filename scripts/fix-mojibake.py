"""Repair text that was repeatedly decoded as Windows-1252 instead of UTF-8."""

import json
from pathlib import Path


TARGET = Path(__file__).parents[1] / "src" / "data" / "products.json"
MOJIBAKE_MARKERS = ("Ã", "Â", "â", "ð", "�")


def cp1252_bytes(text: str) -> bytes:
    """Reverse a Windows-1252 decode, including its five undefined C1 bytes."""
    result = bytearray()
    for character in text:
        codepoint = ord(character)
        if 0x80 <= codepoint <= 0x9F:
            result.append(codepoint)
        else:
            result.extend(character.encode("cp1252"))
    return bytes(result)


def marker_count(text: str) -> int:
    return sum(text.count(marker) for marker in MOJIBAKE_MARKERS)


def repair(text: str) -> str:
    """Apply only conversions that reduce recognizable mojibake markers."""
    current = text
    for _ in range(3):
        try:
            candidate = cp1252_bytes(current).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if marker_count(candidate) >= marker_count(current):
            break
        current = candidate
    return current


def walk(value):
    if isinstance(value, str):
        return repair(value)
    if isinstance(value, list):
        return [walk(item) for item in value]
    if isinstance(value, dict):
        return {key: walk(item) for key, item in value.items()}
    return value


products = json.loads(TARGET.read_text(encoding="utf-8"))
TARGET.write_text(
    json.dumps(walk(products), ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
