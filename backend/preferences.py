from __future__ import annotations
import json
import os
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
    File-backed preference store.
    - Loads from disk on init so preferences survive server restarts.
    - Writes to disk on every set().
    """
    preference: Dict[str, Any] = {}
    _path: Optional[str] = None

    @classmethod
    def init(cls, path: str) -> None:
        cls._path = path
        if os.path.exists(path):
            with open(path, "r") as f:
                cls.preference = json.load(f)

    @classmethod
    def set(cls, pref: Preference) -> None:
        cls.preference = asdict(pref)
        if cls._path:
            with open(cls._path, "w") as f:
                json.dump(cls.preference, f, indent=2)

    @classmethod
    def get(cls) -> Dict[str, Any]:
        return cls.preference
