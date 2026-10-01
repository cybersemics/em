#!/usr/bin/env python3
"""Require the active Cursor model in agent-authored commit commands."""

import hashlib
import json
import pathlib
import re
import subprocess
import sys


def decision(permission, message=None):
    """Return a Cursor permission-hook response."""
    response = {"permission": permission}
    if message:
        response["agent_message"] = message
        response["user_message"] = message
    return response


def git_metadata_path(name):
    """Resolve a file inside this worktree's Git metadata directory."""
    return pathlib.Path(
        subprocess.check_output(["git", "rev-parse", "--git-path", name], text=True, stderr=subprocess.DEVNULL).strip()
    )


def prompt_cache_path(payload):
    """Name a per-conversation cache file when Cursor supplies both IDs."""
    conversation_id = payload.get("conversation_id")
    generation_id = payload.get("generation_id")
    if not conversation_id or not generation_id:
        return None
    conversation_key = hashlib.sha256(conversation_id.encode()).hexdigest()
    return git_metadata_path("cursor-attribution-cache") / f"{conversation_key}.json"


def save_prompt_model(payload):
    """Keep the current generation's model fields outside the worktree."""
    try:
        path = prompt_cache_path(payload)
        if path is None:
            return
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "generation_id": payload["generation_id"],
                    "model": payload.get("model"),
                    "model_id": payload.get("model_id"),
                    "model_params": payload.get("model_params"),
                }
            ),
            encoding="utf-8",
        )
    except (OSError, subprocess.CalledProcessError):
        # Attribution caching must not interrupt a prompt.
        pass


def load_prompt_model(payload):
    """Read model fields only from the matching conversation and generation."""
    try:
        path = prompt_cache_path(payload)
        if path is None or not path.exists():
            return None
        record = json.loads(path.read_text(encoding="utf-8"))
        return record if record.get("generation_id") == payload.get("generation_id") else None
    except (OSError, subprocess.CalledProcessError, json.JSONDecodeError):
        return None


def record_model_fields(payload, cache_hit=None):
    """Record selected hook fields when local diagnostics are enabled."""
    try:
        diagnostic_path = git_metadata_path("cursor-attribution-debug")
        if not diagnostic_path.with_suffix(".enabled").exists():
            return
        record = {
            "event": "prompt" if len(sys.argv) > 1 and sys.argv[1] == "prompt" else "commit",
            "model": payload.get("model"),
            "model_id": payload.get("model_id"),
            "model_params": payload.get("model_params"),
            "cursor_version": payload.get("cursor_version"),
            "conversation_id_present": bool(payload.get("conversation_id")),
            "generation_id_present": bool(payload.get("generation_id")),
            "cache_hit": cache_hit,
        }
        with diagnostic_path.with_suffix(".jsonl").open("a", encoding="utf-8") as output:
            output.write(json.dumps(record) + "\n")
    except (OSError, subprocess.CalledProcessError):
        # Diagnostics must not interrupt a prompt or a commit.
        pass


def main():
    """Check a Cursor shell hook payload for a complete commit trailer."""
    payload = json.load(sys.stdin)

    if len(sys.argv) > 1 and sys.argv[1] == "prompt":
        save_prompt_model(payload)
        record_model_fields(payload)
        return {"continue": True}

    command = payload.get("command", "")

    # The project hook only governs commits run by Cursor's agent shell.
    if not re.search(r"(?:^|[;&|]\s*)git\s+commit\b", command):
        return decision("allow")

    cached = load_prompt_model(payload)
    record_model_fields(payload, cache_hit=cached is not None)
    model = payload.get("model_id") or (cached or {}).get("model_id") or payload.get("model")
    selected_models = (
        payload.get("model_id"),
        payload.get("model"),
        (cached or {}).get("model_id"),
        (cached or {}).get("model"),
    )
    parameters = (payload.get("model_params") or []) + ((cached or {}).get("model_params") or [])
    effort = next(
        (parameter.get("value") for parameter in parameters if parameter.get("id") == "effort"),
        None,
    )

    if not model or any(value and value.lower().startswith("auto") for value in selected_models):
        return decision(
            "deny",
            "Cursor reported Auto or no model ID for this turn. The hook cannot identify Auto's routed model. "
            "For this trial, create the change under a fixed model before committing; switching models only "
            "for the commit would misattribute earlier work.",
        )

    label = f"{model} ({effort})" if effort else model
    trailer = f"Co-Authored-By: Cursor {label} <cursoragent@cursor.com>"
    cursor_trailers = re.findall(r"Co-Authored-By:\s*Cursor[^\n\"']*<cursoragent@cursor\.com>", command, re.IGNORECASE)

    if len(cursor_trailers) == 1 and cursor_trailers[0].lower() == trailer.lower():
        return decision("allow")

    return decision(
        "deny",
        f"Include exactly this trailer in the git commit message: {trailer}. "
        "Remove any other Cursor Co-Authored-By trailer. Cursor may append its own trailer after this hook; "
        "inspect the resulting commit and report any duplicate.",
    )


if __name__ == "__main__":
    json.dump(main(), sys.stdout)
