"""Lightweight file-backed storage for operator-managed backend profiles and bindings."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import Lock
from typing import Callable, TypeVar

from pydantic import ValidationError

from .models import BackendProfileRecord, FeatureBindingRecord

logger = logging.getLogger(__name__)

_STORE_DIRNAME = "backend_bindings"
_PROFILES_FILENAME = "profiles.json"
_BINDINGS_FILENAME = "bindings.json"
_profiles_lock = Lock()
_bindings_lock = Lock()

T = TypeVar("T")


def _store_dir(storage_base_dir: Path) -> Path:
    path = storage_base_dir / _STORE_DIRNAME
    path.mkdir(parents=True, exist_ok=True)
    return path


def _profiles_path(storage_base_dir: Path) -> Path:
    return _store_dir(storage_base_dir) / _PROFILES_FILENAME


def _bindings_path(storage_base_dir: Path) -> Path:
    return _store_dir(storage_base_dir) / _BINDINGS_FILENAME


def _read_json_array(path: Path) -> list[object]:
    if not path.exists():
        return []
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as exc:  # pragma: no cover - defensive
        logger.warning("Failed to read backend bindings store %s: %s", path, exc)
        return []
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Invalid backend bindings JSON in %s: %s", path, exc)
        return []
    return parsed if isinstance(parsed, list) else []


def _write_json_array(path: Path, payload: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    ) as handle:
        temp_path = Path(handle.name)
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    temp_path.replace(path)


def _load_records(
    path: Path,
    model: type[T],
    *,
    key_name: str,
) -> list[T]:
    records: list[T] = []
    for entry in _read_json_array(path):
        if not isinstance(entry, dict):
            continue
        try:
            records.append(model.model_validate(entry))
        except ValidationError as exc:
            logger.warning(
                "Skipping invalid backend bindings store entry in %s (%s=%s): %s",
                path,
                key_name,
                entry.get(key_name),
                exc,
            )
    return records


def _dump_records(records: list[T]) -> list[dict[str, object]]:
    return [record.model_dump(mode="json", exclude_none=True) for record in records]


def _upsert_record(
    records: list[T],
    new_record: T,
    *,
    key_fn: Callable[[T], str],
) -> list[T]:
    record_key = key_fn(new_record)
    next_records = [record for record in records if key_fn(record) != record_key]
    next_records.append(new_record)
    return sorted(next_records, key=key_fn)


def list_backend_profiles(storage_base_dir: Path) -> list[BackendProfileRecord]:
    with _profiles_lock:
        return list(_load_records(_profiles_path(storage_base_dir), BackendProfileRecord, key_name="id"))


def get_backend_profile(
    storage_base_dir: Path, profile_id: str
) -> BackendProfileRecord | None:
    profile_key = profile_id.strip()
    if not profile_key:
        return None
    with _profiles_lock:
        profiles = _load_records(_profiles_path(storage_base_dir), BackendProfileRecord, key_name="id")
    for profile in profiles:
        if profile.id == profile_key:
            return profile
    return None


def upsert_backend_profile(
    storage_base_dir: Path, profile: BackendProfileRecord
) -> BackendProfileRecord:
    with _profiles_lock:
        path = _profiles_path(storage_base_dir)
        profiles = _load_records(path, BackendProfileRecord, key_name="id")
        next_profiles = _upsert_record(profiles, profile, key_fn=lambda record: record.id)
        _write_json_array(path, _dump_records(next_profiles))
    return profile


def delete_backend_profile(storage_base_dir: Path, profile_id: str) -> bool:
    profile_key = profile_id.strip()
    if not profile_key:
        return False
    with _profiles_lock:
        path = _profiles_path(storage_base_dir)
        profiles = _load_records(path, BackendProfileRecord, key_name="id")
        next_profiles = [record for record in profiles if record.id != profile_key]
        if len(next_profiles) == len(profiles):
            return False
        _write_json_array(path, _dump_records(next_profiles))
    return True


def list_feature_bindings(storage_base_dir: Path) -> list[FeatureBindingRecord]:
    with _bindings_lock:
        return list(
            _load_records(
                _bindings_path(storage_base_dir), FeatureBindingRecord, key_name="feature_key"
            )
        )


def get_feature_binding(
    storage_base_dir: Path, feature_key: str
) -> FeatureBindingRecord | None:
    normalized_key = feature_key.strip()
    if not normalized_key:
        return None
    with _bindings_lock:
        bindings = _load_records(
            _bindings_path(storage_base_dir), FeatureBindingRecord, key_name="feature_key"
        )
    for binding in bindings:
        if binding.feature_key == normalized_key:
            return binding
    return None


def upsert_feature_binding(
    storage_base_dir: Path, binding: FeatureBindingRecord
) -> FeatureBindingRecord:
    with _bindings_lock:
        path = _bindings_path(storage_base_dir)
        bindings = _load_records(path, FeatureBindingRecord, key_name="feature_key")
        next_bindings = _upsert_record(
            bindings, binding, key_fn=lambda record: record.feature_key
        )
        _write_json_array(path, _dump_records(next_bindings))
    return binding


def delete_feature_binding(storage_base_dir: Path, feature_key: str) -> bool:
    normalized_key = feature_key.strip()
    if not normalized_key:
        return False
    with _bindings_lock:
        path = _bindings_path(storage_base_dir)
        bindings = _load_records(path, FeatureBindingRecord, key_name="feature_key")
        next_bindings = [
            record for record in bindings if record.feature_key != normalized_key
        ]
        if len(next_bindings) == len(bindings):
            return False
        _write_json_array(path, _dump_records(next_bindings))
    return True
