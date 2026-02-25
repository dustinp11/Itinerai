from __future__ import annotations
import json
import os
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class Pin:
    pin_id: str
    clerk_user_id: str
    itinerary_id: str
    place_names: List[str] = field(default_factory=list)
    places: List[Dict[str, Any]] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @staticmethod
    def new(clerk_user_id: str, itinerary_id: str) -> "Pin":
        return Pin(
            pin_id=str(uuid.uuid4()),
            clerk_user_id=clerk_user_id,
            itinerary_id=itinerary_id,
        )


class PinStore:
    """
    File-backed pin store.
    - Loads from disk on init so pins survive server restarts.
    - Writes to disk on every save/delete.
    - Keyed by pin_id.
    """
    pins: Dict[str, Dict[str, Any]] = {}
    _path: Optional[str] = None

    @classmethod
    def init(cls, path: str) -> None:
        cls._path = path
        if os.path.exists(path):
            with open(path, "r") as f:
                cls.pins = json.load(f)
        else:
            cls.pins = {}

    @classmethod
    def save(cls, pin: Pin) -> None:
        cls.pins[pin.pin_id] = asdict(pin)
        cls._write()

    @classmethod
    def get(cls, pin_id: str) -> Optional[Dict[str, Any]]:
        return cls.pins.get(pin_id)

    @classmethod
    def get_by_itinerary(cls, clerk_user_id: str, itinerary_id: str) -> List[Dict[str, Any]]:
        return [
            p for p in cls.pins.values()
            if p["clerk_user_id"] == clerk_user_id and p["itinerary_id"] == itinerary_id
        ]

    @classmethod
    def get_by_user(cls, clerk_user_id: str) -> List[Dict[str, Any]]:
        return [p for p in cls.pins.values() if p["clerk_user_id"] == clerk_user_id]

    @classmethod
    def delete(cls, pin_id: str) -> bool:
        if pin_id in cls.pins:
            del cls.pins[pin_id]
            cls._write()
            return True
        return False

    @classmethod
    def _write(cls) -> None:
        if cls._path:
            os.makedirs(os.path.dirname(cls._path), exist_ok=True)
            with open(cls._path, "w") as f:
                json.dump(cls.pins, f, indent=2)
