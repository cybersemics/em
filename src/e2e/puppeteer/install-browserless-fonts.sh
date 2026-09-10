#!/bin/bash

# Installs Microsoft Core Fonts in a running Browserless container and verifies that Helvetica resolves to Arial.

set -eo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <browserless-container-id>" >&2
    exit 2
fi

browserless_container_id="$1"

echo "Installing Microsoft Core Fonts in Browserless..."
docker exec --user root "$browserless_container_id" bash -c '
    set -eo pipefail
    echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ttf-mscorefonts-installer >/dev/null
    fc-cache -f >/dev/null
'

font_family=$(docker exec "$browserless_container_id" fc-match --format='%{family[0]}\n' Helvetica)
if [ "$font_family" != "Arial" ]; then
    echo "Error: Expected Helvetica to resolve to Arial in Browserless, but it resolved to $font_family." >&2
    exit 1
fi

echo "Verified that Helvetica resolves to Arial in Browserless."
