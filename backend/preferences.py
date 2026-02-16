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
    - Stores preferences per user, keyed by clerkUserId.
    """
    preferences: Dict[str, Dict[str, Any]] = {}
    _path: Optional[str] = None

    @classmethod
    def init(cls, path: str) -> None:
        cls._path = path
        if os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
                # Handle migration from single preference to multi-user preferences
                if isinstance(data, dict) and "clerkUserId" in data:
                    # Old format: single preference object
                    clerk_user_id = data.get("clerkUserId")
                    cls.preferences = {clerk_user_id: data}
                elif isinstance(data, dict):
                    # New format: dictionary of preferences keyed by clerkUserId
                    cls.preferences = data
                else:
                    cls.preferences = {}

    @classmethod
    def set(cls, pref: Preference) -> None:
        pref_dict = asdict(pref)
        clerk_user_id = pref.clerkUserId
        cls.preferences[clerk_user_id] = pref_dict
        if cls._path:
            with open(cls._path, "w") as f:
                json.dump(cls.preferences, f, indent=2)

    @classmethod
    def get(cls, clerk_user_id: str) -> Optional[Dict[str, Any]]:
        return cls.preferences.get(clerk_user_id)
