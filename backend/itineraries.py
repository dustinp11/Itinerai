from __future__ import annotations
import json
import os
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class Itinerary:
    itinerary_id: str
    clerk_user_id: str
    name: str
    city: str
    stop_count: int
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ItineraryStore:
    """
    File-backed itinerary store, keyed by itinerary_id.
    """
    itineraries: Dict[str, Dict[str, Any]] = {}
    _path: Optional[str] = None

    @classmethod
    def init(cls, path: str) -> None:
        cls._path = path
        if os.path.exists(path):
            with open(path, "r") as f:
                cls.itineraries = json.load(f)
        else:
            cls.itineraries = {}

    @classmethod
    def save(cls, itinerary: Itinerary) -> None:
        cls.itineraries[itinerary.itinerary_id] = asdict(itinerary)
        cls._write()

    @classmethod
    def get(cls, itinerary_id: str) -> Optional[Dict[str, Any]]:
        return cls.itineraries.get(itinerary_id)

    @classmethod
    def get_by_user(cls, clerk_user_id: str) -> List[Dict[str, Any]]:
        return [
            i for i in cls.itineraries.values()
            if i["clerk_user_id"] == clerk_user_id
        ]

    @classmethod
    def _write(cls) -> None:
        if cls._path:
            os.makedirs(os.path.dirname(cls._path), exist_ok=True)
            with open(cls._path, "w") as f:
                json.dump(cls.itineraries, f, indent=2)
