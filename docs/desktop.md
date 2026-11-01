# Desktop App

The desktop app is a [Tauri 2](https://tauri.app) shell in [`desktop/`](../desktop) that runs the same web build as the PWA. A release loads the bundled build (`frontendDist: ../build` in [`tauri.conf.json`](../desktop/tauri.conf.json)), and `yarn tauri:dev` loads the dev server at `http://localhost:3000` instead. The identifier is `com.thinkwithem.em`, and the version comes from `package.json`.

| Workflow | What it does |
| --- | --- |
| [`tauri-release-main.yml`](../.github/workflows/tauri-release-main.yml) | Builds macOS (Apple Silicon and Intel), Linux and Windows on every push to `main`, and replaces the assets of the rolling `pre` prerelease |
| [`tauri-release-prod.yml`](../.github/workflows/tauri-release-prod.yml) | Publishes a permanent, versioned release for the same platforms when a `v*` tag is pushed |
| [`tauri-check.yml`](../.github/workflows/tauri-check.yml) | Compiles the Rust side on pull requests that could break it (see [Testing](testing.md#tauri-npm-packages-and-crates)) |

Drag and drop needs `dragDropEnabled: false` on the window; see [Drag and Drop](drag-and-drop.md#tauri-desktop-shell).

## The window is a webview, not a browser

- **The engine depends on the platform:** WKWebView on macOS, WebView2 (Chromium) on Windows, WebKitGTK on Linux. The macOS app is WebKit, like Safari, so it lags Chromium on new CSS. A layout bug that only the macOS app shows is WebKit's until shown otherwise. Reproduce it in WebKit (Safari, or Playwright's WebKit build), not in Chromium: Brave, the Puppeteer suite and an agent's browser pane prove nothing about it.
- **The window keeps its own storage**, apart from every browser tab on the same origin. On macOS its `localStorage` lives under `~/Library/WebKit/com.thinkwithem.em/WebsiteData/Default/` (see #6156 for how large its write-ahead log can grow).
- **A window covered by other windows may not finish loading.** In other Tauri apps, WebKit held back a covered window: the page booted, but hydration and its fetches waited until the window was shown. Bring the window forward before deciding a reload is dead.
- **The app inherits no shell environment.** A GUI app launched from Finder or `open` sees no `.env` file and no `PATH` additions. The web build's configuration is fixed by `yarn build`, so this only matters for something read at runtime.

## Menus and shortcuts

- **The app builds no menu of its own.** On macOS it gets Tauri's default menu: the app menu (About, Services, Hide, Quit), File (Close Window), Edit (Undo, Redo, Cut, Copy, Paste, Select All), View (Toggle Full Screen), Window and Help. Windows and Linux get no menu.
- **The Edit menu is what makes copy and paste work.** A WKWebView has no copy, paste or select-all shortcuts without those menu items. A menu the app builds replaces the default one and must keep them (#5219).
- **The About box repeats the version** in its parentheses, `Version 1.2.0 (1.2.0)`, where it could show the build's commit (#6196).
- **A menu accelerator takes the key press before the page sees it.** A menu item bound to a key em already uses silently takes that key from the web app. em binds ⌘0 (Remove Format), ⌘[ and ⌘] (Back and Forward), ⌘P (the Command Universe), and bare keys such as Space (Indent) and Enter (New Thought). See [Commands](commands.md) for the full list.
- **Browser shortcuts the app does not have yet:** ⌘R to reload (#6197), ⌘= and ⌘- for Font Size (#6198), and ⌘F to find (#5101).

## Content Security Policy

- **The desktop app sets no CSP** (`"csp": null` in `tauri.conf.json`, tracked with the web app's in #5171).
- **Once it has one, scripts the app injects follow it too.** In another Tauri app an injected script still ran, but its `fetch` obeyed `connect-src` and an inline `<style>` it added obeyed `style-src`. Style an injected script with constructed stylesheets.
- **WebKit asks a navigation handler about every frame's navigation**, not only the window's. A handler that allows only the app's own origin blanks an `iframe srcdoc`. em has no navigation handler today.

## Driving the installed app

These work on the installed app without Computer Use.

- **Find the process** with `pgrep -f /Applications/em.app/Contents/MacOS`. The binary is named `em`.
- **Read the menus and the About box** through System Events, by pid:

  ```bash
  osascript -e "tell application \"System Events\" to tell (first process whose unix id is $pid) to get name of every menu item of menu 1 of menu bar item 4 of menu bar 1"
  ```

  Menu bar item 1 is the Apple menu, 2 is em, 3 File, 4 Edit. Clicking `menu item 1 of menu 1 of menu bar item 2` opens About, and `get value of every static text of every window` reads it.
- **Capture the window** by its number: list the pid's windows with a few lines of Swift over `CGWindowListCopyWindowInfo`, then `screencapture -x -o -l <number> out.png`. The main window is the one named `em`.
- **Install a build into `/Applications` before testing a macOS permission.** An app run from `/private/tmp` cannot be granted one, and asking from there leaves macOS refusing later requests without a prompt.
