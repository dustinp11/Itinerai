from __future__ import annotations
from dataclasses import dataclass, asdict
from typing import Any, Dict, Optional

@dataclass
class Preference:
    clerkUserId: str
    activities: list[str]
    budget: str
    travelDistance: Optional[str]
    transportModes: list[str]

class PreferenceStore:
    """
    Simple in-memory store using a class attribute.
    - Shared across all requests
    - Resets when server restarts
    """
    preference: Dict[str, Any] = {}  # class attribute

    @classmethod
    def set(cls, pref: Preference) -> None:
        cls.preference = asdict(pref)

    @classmethod
    def get(cls) -> Dict[str, Any]:
        return cls.preference
