#!/usr/bin/env python3
"""Require the active Cursor model in agent-authored commit commands."""

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


def record_model_fields(payload):
    """Record selected hook fields when local diagnostics are enabled."""
    try:
        git_path = subprocess.check_output(
            ["git", "rev-parse", "--git-path", "cursor-attribution-debug"], text=True, stderr=subprocess.DEVNULL
        ).strip()
        diagnostic_path = pathlib.Path(git_path)
        if not diagnostic_path.with_suffix(".enabled").exists():
            return
        record = {
            "event": "prompt" if len(sys.argv) > 1 and sys.argv[1] == "prompt" else "commit",
            "model": payload.get("model"),
            "model_id": payload.get("model_id"),
            "model_params": payload.get("model_params"),
            "cursor_version": payload.get("cursor_version"),
        }
        with diagnostic_path.with_suffix(".jsonl").open("a", encoding="utf-8") as output:
            output.write(json.dumps(record) + "\n")
    except (OSError, subprocess.CalledProcessError):
        # Diagnostics must not interrupt a prompt or a commit.
        pass


def main():
    """Check a Cursor shell hook payload for a complete commit trailer."""
    payload = json.load(sys.stdin)
    record_model_fields(payload)

    if len(sys.argv) > 1 and sys.argv[1] == "prompt":
        return {"continue": True}

    command = payload.get("command", "")

    # The project hook only governs commits run by Cursor's agent shell.
    if not re.search(r"(?:^|[;&|]\s*)git\s+commit\b", command):
        return decision("allow")

    model = payload.get("model_id") or payload.get("model")
    effort = next(
        (parameter.get("value") for parameter in payload.get("model_params") or [] if parameter.get("id") == "effort"),
        None,
    )

    if not model or model.lower().startswith("auto"):
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
