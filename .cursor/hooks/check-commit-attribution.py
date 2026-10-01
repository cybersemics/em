#!/usr/bin/env python3
"""Require the active Cursor model in agent-authored commit commands."""

import json
import re
import sys


def decision(permission, message=None):
    """Return a Cursor permission-hook response."""
    response = {"permission": permission}
    if message:
        response["agent_message"] = message
        response["user_message"] = message
    return response


def main():
    """Check a Cursor shell hook payload for a complete commit trailer."""
    payload = json.load(sys.stdin)
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
