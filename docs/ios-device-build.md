# iOS Device Build

How to build the Capacitor app from a branch and install it on a physical iPhone for manual testing, from the command line, without opening Xcode. The `cap:*` scripts in `package.json` stop at opening Xcode; this is the rest of the way.

## Recipe

From the repo root:

```bash
yarn install --frozen-lockfile
yarn build
BUILD_MODE=static NODE_ENV=development LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx cap sync ios
```

Then, in `ios/App`, with `<udid>` from `xcrun devicectl list devices | grep -v simulated`:

```bash
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'id=<udid>' -derivedDataPath <scratch>/dd -allowProvisioningUpdates build
xcrun devicectl device install app --device <udid> <scratch>/dd/Build/Products/Debug-iphoneos/App.app
xcrun devicectl device process launch --device <udid> <bundle-id>
```

- **Use `BUILD_MODE=static` for a phone that leaves the desk.** It bundles `build/` into the app ([`capacitor.config.ts`](../capacitor.config.ts)). The default `server` mode points the app at `CAPACITOR_SERVER_URL` from the `.env` cascade, so it works only while a dev server on the Mac is reachable.
- **A branch that adds or changes a Capacitor plugin needs this full native build.** `cap sync` runs `pod install`, which is what pulls a new plugin's pod in; the previously installed app and a web-only rebuild both lack it. `git diff --stat <base> -- package.json yarn.lock ios` shows whether a branch touches native dependencies.
- **CocoaPods crashes without a UTF-8 locale.** In an agent shell `pod install` (and so `cap sync ios`) dies with `Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)`; the `LANG` / `LC_ALL` prefix above prevents it.

## Signing

The project's bundle ID `com.thinkwithem.em` is registered to the em organization's team. A machine whose Xcode account has only a free Personal Team cannot register or sign it — `xcodebuild` fails with *Failed Registering Bundle Identifier … not available*. `security find-identity -v -p codesigning` and `defaults read com.apple.dt.Xcode IDEProvisioningTeamByIdentifier` show which teams the machine can sign for.

On a Personal Team, build under a bundle ID of your own:

```bash
sed -i '' 's/PRODUCT_BUNDLE_IDENTIFIER = com.thinkwithem.em;/PRODUCT_BUNDLE_IDENTIFIER = <your.id>;/' App.xcodeproj/project.pbxproj
# xcodebuild … as above
git checkout -- App.xcodeproj/project.pbxproj
```

- **Do not pass `PRODUCT_BUNDLE_IDENTIFIER=` to `xcodebuild` instead.** A command-line build setting applies to every target, including the CocoaPods frameworks (`Cordova`, `WebviewBackground`, …). The build succeeds, but the install fails with `MIInstallerErrorDomain error 57` / `DuplicateIdentifier`, because every embedded framework now shares the app's identifier. Editing only the App target's setting in the project file, and restoring it afterwards, avoids that.
- **The first launch fails until the phone trusts the certificate.** `devicectl` reports `FBSOpenApplicationErrorDomain error 3` (*invalid code signature … not been explicitly trusted*). The phone's owner must trust the developer under Settings → General → VPN & Device Management; launches work after that.
- **A free-team build stops launching after 7 days.**

## Launch crashes

- **Check that the app is still running after launch.** `devicectl device process launch --console` reported `exit code 0` for an app that was crashing on launch, so its result is not evidence that the app ran. Instead, launch without `--console`, wait a few seconds, and look for the process with `xcrun devicectl device info processes --device <udid> | grep App.app`.
- **Read the crash report from the device.** `xcrun devicectl device info files --device <udid> --domain-type systemCrashLogs` lists `App-<date>.ips` files, and `xcrun devicectl device copy from --device <udid> --domain-type systemCrashLogs --source <file> --destination <path>` copies one off. An `.ips` file is a JSON header line followed by a JSON body. The crashing thread is the entry in `threads` with `triggered: true`, and each of its `frames` has an `imageIndex` into `usedImages` plus a `symbol`, which together give a readable backtrace.
- **iOS 27 kills an app that has not adopted the UIScene lifecycle.** It crashes as it opens with `EXC_BREAKPOINT` in `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`. The app adopted the scene lifecycle in [#5827](https://github.com/cybersemics/em/pull/5827), so any branch cut before that crashes on iOS 27 whatever its own change does. To test such a branch on a device, merge `main` into it first.
