#!/usr/bin/env bash
#
# scripts/build-em-browserstack-ipa.sh
#
# Creates a special build of em's iOS app, for use with BrowserStack agent automation.
# This build is produced in "server mode" -- the Capacitor WKWebView loads from a URL
# (baked to https://bs-local.com:3000, BrowserStack's magic hostname that resolves back
# to whichever machine has a BrowserStack Local tunnel running) instead of the bundled
# web build -- then uploads the resulting .ipa straight to BrowserStack App Automate
# under a fixed custom_id. That's what lets browser-control-ios (see
# .github/skills/browser-control-ios/SKILL.md) drive a live dev server on a real device
# without a per-run native rebuild.
#
# Runs entirely on your own Mac, using whatever Apple ID / Xcode signing you already
# have set up. No GitHub Actions, no CI secrets, no paid Apple Developer Program
# membership required -- a free/personal-team Development certificate + provisioning
# profile is enough.
#
# BrowserStack re-signs the app with its own certificate on upload
# regardless of how you signed it locally (see BrowserStack's "Re-sign iOS apps" docs),
# so a free-tier Development signature is all this ever needed.
#
#
# WHAT YOU NEED FIRST
# --------------------
# - Xcode, with this project opened and built/run at least once targeting a device or
#   "Any iOS Device" under your own Apple ID (Xcode > Settings > Accounts). That one-time
#   build is what creates the Development certificate + provisioning profile this script
#   looks for. If you haven't done that yet: open ios/App/App.xcworkspace, select your
#   Apple ID's team under the App target's Signing & Capabilities tab, and build once.
# - CocoaPods (`pod --version`; `gem install cocoapods` if that's missing).
# - A BrowserStack account with App Automate access.
#
# USAGE
# -----
# Run at the em repository's root, passing your BrowserStack credentials inline:
#
#   BROWSERSTACK_USERNAME=value BROWSERSTACK_ACCESS_KEY=value yarn build:ios:browserstack
#
# That yarn script is just an alias for this file, so invoking it directly works the
# same way and takes the same variables:
#
#   BROWSERSTACK_USERNAME=value BROWSERSTACK_ACCESS_KEY=value ./scripts/build-em-browserstack-ipa.sh
#
# Optional, also inline:
#   BROWSERSTACK_CUSTOM_ID   Upload under a different id (default: em-server-mode).
#                            Anything other than the default will NOT be picked up by
#                            browser-control-ios, which looks for em-server-mode.
#   EM_REPO_DIR              Path to the em checkout, if this script is being run from
#                            somewhere other than inside one.

set -euo pipefail

# --- Configuration ----------------------------------------------------------------
# Everything comes from the environment -- there is no config file to create, and
# nothing is written to disk that you would later have to remember to keep out of git.
: "${BROWSERSTACK_USERNAME:?Pass BROWSERSTACK_USERNAME=... on the command line}"
: "${BROWSERSTACK_ACCESS_KEY:?Pass BROWSERSTACK_ACCESS_KEY=... on the command line}"
BROWSERSTACK_CUSTOM_ID="${BROWSERSTACK_CUSTOM_ID:-em-server-mode}"

# The guards above only catch credentials that are missing or empty. Credentials that
# are present but wrong would otherwise not surface until the upload at the very end,
# after a full install / sync / archive / export cycle costing several minutes. One
# sub-second request settles it up front -- same reasoning as the certificate check in
# Step 3.
echo "==> Verifying BrowserStack credentials"
AUTH_STATUS=$(curl -s -o /dev/null -w '%{http_code}' \
  -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
  "https://api-cloud.browserstack.com/app-automate/plan.json" || true)
if [ "$AUTH_STATUS" = "401" ]; then
  echo "BrowserStack rejected these credentials (HTTP 401)." >&2
  echo "Check BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY against https://www.browserstack.com/accounts/profile/details" >&2
  exit 1
elif [ "$AUTH_STATUS" != "200" ]; then
  echo "Could not reach BrowserStack App Automate to verify credentials (HTTP ${AUTH_STATUS:-000})." >&2
  echo "The upload at the end needs the same access, so stopping here rather than building first." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# REPO_DIR normally defaults to "one level up from this script" (i.e. this script is
# expected to live at <em checkout>/scripts/build-em-browserstack-ipa.sh). Pass
# EM_REPO_DIR to override that -- e.g. if this script gets copied and run from
# somewhere other than inside an actual em checkout.
if [ -n "${EM_REPO_DIR:-}" ]; then
  REPO_DIR="$(cd "$EM_REPO_DIR" && pwd)"
else
  REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
if [ ! -f "$REPO_DIR/ios/App/App.xcodeproj/project.pbxproj" ]; then
  echo "$REPO_DIR doesn't look like an em checkout (no ios/App/App.xcodeproj)." >&2
  echo "Pass EM_REPO_DIR=<path to your em checkout> to override." >&2
  exit 1
fi
echo "==> Repo: $REPO_DIR"

if ! command -v pod >/dev/null 2>&1; then
  echo "CocoaPods not found -- run 'gem install cocoapods' first." >&2
  exit 1
fi

cd "$REPO_DIR"
# Scratch space for the archive, the export, and the certificates dumped in Step 3.
# Pinned to /tmp and created 0700 by mktemp, so nothing lands in the repo or in a
# user directory, and the trap clears it on every exit path including failure.
WORKDIR=$(mktemp -d /tmp/em-browserstack-ipa.XXXXXXXX)
trap 'rm -rf "$WORKDIR"' EXIT

# --- Step 1: what bundle id are we signing for? -----------------------------------
BUNDLE_ID=$(grep -m1 'PRODUCT_BUNDLE_IDENTIFIER' ios/App/App.xcodeproj/project.pbxproj | sed -E 's/.*= *([^;]+);.*/\1/')
echo "==> Bundle id: $BUNDLE_ID"

# --- Step 2: find a provisioning profile covering this bundle id ------------------
# Match on Entitlements.application-identifier, which is "<TEAMID>.<bundle id or
# pattern>". Never substring-grep it: em has sibling bundle ids
# (com.thinkwithem.em-playground, com.thinkwithem.em.123) whose profiles would
# false-positive. Glob-compare instead, which excludes those while still accepting
# the team-wide wildcard profile Xcode normally issues.
PROFILES_DIR="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"
PROFILE_PATH=""
PROFILE_MATCH=""
for f in "$PROFILES_DIR"/*.mobileprovision "$PROFILES_DIR"/*.provisionprofile; do
  [ -e "$f" ] || continue
  security cms -D -i "$f" > "$WORKDIR/profile.plist" 2>/dev/null || continue
  appid=$(/usr/libexec/PlistBuddy -c "Print :Entitlements:application-identifier" "$WORKDIR/profile.plist" 2>/dev/null) || continue
  [ -n "$appid" ] || continue

  # Strip the team prefix. What remains is either a literal bundle id or a pattern
  # ending in "*" -- Xcode issues a team-wide "<TEAMID>.*" profile for any app that
  # needs no entitlement-specific App ID, which is the common case and covers em.
  pattern="${appid#*.}"

  # Glob-compare rather than substring-grep. Sibling ids still cannot false-positive
  # (com.thinkwithem.em-playground does not match com.thinkwithem.em), but a genuine
  # wildcard profile now does.
  # shellcheck disable=SC2053
  [[ "$BUNDLE_ID" == $pattern ]] || continue

  case "$pattern" in
    "$BUNDLE_ID") kind="exact" ;;
    *) kind="wildcard $pattern" ;;
  esac

  # An exact profile beats a wildcard, so take the first exact one and stop; otherwise
  # hold the wildcard and keep looking in case an exact one turns up later.
  if [ -z "$PROFILE_PATH" ] || [ "$kind" = "exact" ]; then
    PROFILE_PATH="$f"
    PROFILE_MATCH="$kind"
    TEAM_ID=$(/usr/libexec/PlistBuddy -c "Print :TeamIdentifier:0" "$WORKDIR/profile.plist")
    EXPIRY=$(/usr/libexec/PlistBuddy -c "Print :ExpirationDate" "$WORKDIR/profile.plist")
  fi
  [ "$kind" = "exact" ] && break
done
if [ -z "${PROFILE_PATH:-}" ]; then
  echo "No provisioning profile on this Mac matches bundle id $BUNDLE_ID." >&2
  cat >&2 <<'REMEDY'

Xcode creates that profile the first time you build the app for a device under your
own Apple ID. This is one-time setup, and a free Apple ID is enough -- BrowserStack
re-signs the app on upload, so no paid Developer Program membership is required.

To create it:

  1. Generate the native project's inputs, if you have not built the iOS app here
     before. Capacitor writes capacitor.config.json, config.xml and public/ into
     ios/App/App/ -- all three are gitignored build products, so a fresh checkout
     does not have them and Xcode fails with "the file couldn't be opened". This
     also runs pod install for you:

         BUILD_MODE=server NODE_ENV=development \
           CAPACITOR_SERVER_URL=https://bs-local.com:3000 npx cap sync ios

     (This script runs the same command itself at Step 4, but not until after the
     signing checks below -- so the very first time through, you have to run it by
     hand to get a project Xcode can build.)

  2. Open the workspace -- the .xcworkspace, NOT the .xcodeproj:

         open ios/App/App.xcworkspace

  3. Make sure your Apple ID is signed in:
     Xcode > Settings > Accounts > "+" > Apple ID.

  4. Select the "App" target, then the "Signing & Capabilities" tab.
     Tick "Automatically manage signing" and set Team to your own account
     -- a free account appears as "<Your Name> (Personal Team)".

     NOTE: doing this rewrites DEVELOPMENT_TEAM in
     ios/App/App.xcodeproj/project.pbxproj to your team id. That is a local
     signing preference, NOT a project change -- committing it would switch
     everyone else's builds, and CI's, to your team. Leave it out of your
     commits, or revert it once the profile exists:

         git checkout -- ios/App/App.xcodeproj/project.pbxproj

     This script does not read DEVELOPMENT_TEAM (it archives unsigned and
     resolves the team from the profile at export), so reverting it is safe.

  5. Set the build destination to "Any iOS Device (arm64)", or a real iPhone
     plugged in. A Simulator destination will NOT create a provisioning profile,
     which is the usual reason for ending up back at this message.

  6. Build once with Cmd-B and let it finish.

  7. Re-run this script.

REMEDY
  exit 1
fi
echo "==> Provisioning profile: $(basename "$PROFILE_PATH") -- $PROFILE_MATCH match (team $TEAM_ID, expires $EXPIRY)"

# --- Step 3: fail fast if there's no valid certificate for that same team --------
# Purely a diagnostic check -- automatic signing style (Step 6) resolves the identity
# itself, so nothing here is threaded through to the actual build. This just turns "cert
# expired/revoked" into a clear message up front instead of a cryptic xcodebuild failure
# several minutes into the build. -v excludes already-expired/revoked identities.
security find-certificate -a -p ~/Library/Keychains/login.keychain-db |
  awk -v d="$WORKDIR" '/-----BEGIN CERTIFICATE-----/{n++} {print > (d "/cert" n ".pem")}'
FOUND_VALID_CERT=""
for hash in $(security find-identity -v -p codesigning | grep -oE '[A-F0-9]{40}'); do
  for pem in "$WORKDIR"/cert*.pem; do
    [ -e "$pem" ] || continue
    fp=$(openssl x509 -noout -fingerprint -sha1 -in "$pem" 2>/dev/null | sed 's/.*=//; s/://g')
    [ "$fp" = "$hash" ] || continue
    ou=$(openssl x509 -noout -subject -in "$pem" | grep -oE 'OU=[^,/]+' | cut -d= -f2)
    [ "$ou" = "$TEAM_ID" ] && FOUND_VALID_CERT=1
    break
  done
  [ -n "$FOUND_VALID_CERT" ] && break
done
if [ -z "$FOUND_VALID_CERT" ]; then
  echo "No valid (non-expired, non-revoked) codesigning certificate found for team $TEAM_ID." >&2
  echo "The profile exists but no usable certificate goes with it -- certificates expire" >&2
  echo "after a year (sooner for a free account), and Xcode refreshes them on build." >&2
  echo "Open ios/App/App.xcworkspace, confirm your team is still selected under the App" >&2
  echo "target's Signing & Capabilities tab, build once for \"Any iOS Device (arm64)\"," >&2
  echo "then re-run this script." >&2
  exit 1
fi
echo "==> Matching certificate found for team $TEAM_ID"

# --- Step 4: install JS dependencies and point Capacitor at the BrowserStack tunnel host
# corepack ships the Yarn version pinned in package.json's "packageManager" field, but
# `corepack enable` works by writing shims into Node's own bin directory -- which fails
# outright when that directory is read-only, as it is on Nix and any other immutable
# Node install. So only reach for corepack when yarn is genuinely missing; if yarn is
# already on PATH, it is either the pinned version or Yarn itself will say so.
if ! command -v yarn >/dev/null 2>&1; then
  echo "==> yarn not found -- enabling corepack"
  if ! corepack enable; then
    echo "corepack enable failed, and yarn is not on PATH." >&2
    echo "That failure is expected on an immutable Node install (Nix, or any setup where" >&2
    echo "Node's bin directory is read-only) -- corepack cannot write its shims there." >&2
    echo "Install yarn through whatever manages Node on this machine, then re-run." >&2
    exit 1
  fi
fi

echo "==> yarn install"
yarn install --silent

echo "==> cap sync (server mode)"
BUILD_MODE=server NODE_ENV=development CAPACITOR_SERVER_URL=https://bs-local.com:3000 npx cap sync ios

echo "==> pod install"
(cd ios/App && pod install)

# --- Step 5: archive without signing --------------------------------------------
# A manual CODE_SIGN_STYLE/PROVISIONING_PROFILE_SPECIFIER override on the command line
# applies to every target xcodebuild touches, including every CocoaPods library target
# (Capacitor, WebviewBackground, Pods-App, ...) -- and those are libraries, not app
# bundles, so they can't carry a provisioning profile. Forcing one onto them fails the
# whole archive. So: skip signing entirely here, and let Export (Step 6) sign just the
# App bundle.
#
# Debug, not Release: DevServerCertPlugin (ios/App/App/DevServerViewController.swift),
# which trusts the dev server's self-signed certificate, is compiled out by #if DEBUG in
# Release builds. A Release IPA connects to https://bs-local.com:3000, gets the TLS
# challenge, rejects it, and renders a blank webview -- this build only ever targets the
# dev server, so it must be Debug.
echo "==> xcodebuild archive"
xcodebuild archive \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -archivePath "$WORKDIR/App.xcarchive" \
  -destination 'generic/platform=iOS' \
  CODE_SIGNING_ALLOWED=NO

# --- Step 6: exportOptions.plist -------------------------------------------------
# signingStyle is "automatic", not "manual": the profile found in Step 2 is one Xcode
# generated via its own automatic-signing UI ("iOS Team Provisioning Profile: ..."), and
# Xcode internally flags those as "Xcode managed" -- it refuses to use an Xcode-managed
# profile under signingStyle=manual at export time, even though the same profile signs
# fine locally in Xcode itself. "automatic" resolves using whatever matching cert +
# profile are already on this Mac (Steps 2-3), with no network access or live Apple ID
# session needed -- that's only required if asked to *fetch or renew* profiles, which
# this isn't doing.
cat > "$WORKDIR/exportOptions.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>development</string>
  <key>teamID</key>
  <string>$TEAM_ID</string>
  <key>signingStyle</key>
  <string>automatic</string>
</dict>
</plist>
PLIST

echo "==> xcodebuild -exportArchive"
xcodebuild -exportArchive \
  -archivePath "$WORKDIR/App.xcarchive" \
  -exportPath "$WORKDIR/export" \
  -exportOptionsPlist "$WORKDIR/exportOptions.plist"

# --- Step 7: upload to BrowserStack ----------------------------------------------
echo "==> Uploading to BrowserStack (custom_id=$BROWSERSTACK_CUSTOM_ID)"
RESPONSE=$(curl -sf -u "$BROWSERSTACK_USERNAME:$BROWSERSTACK_ACCESS_KEY" \
  -X POST "https://api-cloud.browserstack.com/app-automate/upload" \
  -F "file=@$WORKDIR/export/App.ipa" \
  -F "custom_id=$BROWSERSTACK_CUSTOM_ID")
echo "$RESPONSE"

if ! echo "$RESPONSE" | grep -q '"app_url"'; then
  echo "Upload response didn't contain an app_url -- something went wrong. See the response above." >&2
  exit 1
fi
echo "==> Done. $BROWSERSTACK_CUSTOM_ID is now live on BrowserStack App Automate."
