# em

**em** is a beautiful, minimalistic note-taking app for personal sensemaking.

- **cognitively-informed** - Supports focus, nonlinearity, and associative connectivity.
- **process-oriented** - Facilitates flow and organic thinking.
- **semiotic** - Mediates concept through a monistic, contextual semiotic web.

## Documentation

- [Overview](https://github.com/cybersemics/em/wiki/Docs) - An overview of the architecture, data structures, and tips for contributors.
- [Roadmap](https://github.com/cybersemics/em/wiki/Roadmap) - A high level overview of the project, including vision and objectives.

## Setup

Install dependencies:

```
yarn
```

Start the dev server for local development:

```sh
yarn start
```

## Testing

There are two testing scripts:

- `yarn test` - Unit tests covering Redux actions, reducers, util, components with react-testing-library on JSDOM.
- `yarn test:puppeteer` - Puppeteer tests will test realistic user behavior against a headless Chrome instance. Requires Docker for platform-independent execution.

### Windows

You will need the bash cli in your system to run the Puppeteer tests on Windows.

There are two ways to run bash on Windows:

- Windows Subsystem for Linux (WSL)
  1. Install Ubuntu in your Windows Linux Subsystem. (Search on google for installation guide.)
  2. Run Ubuntu and you will have bash available by default.
  3. `yarn` and `yarn start` as above.
- Git Bash
  1. Install git with bash cli in windows.
  2. Open the code repository in bash cli.
  3. `yarn` and `yarn start` as above.

## Native App Development

**em** is a Progressive Web App (PWA) that runs on native platforms using [Capacitor](https://capacitorjs.com/).

### Prerequisites

- For iOS development, ensure Xcode and CocoaPods are installed.
- For Android development, ensure Android Studio is installed.

### Modes

There are two development modes that determine where the Capacitor build loads the web resources from. Each mode can be run on iOS or Android.

| Mode   | Description                                          | iOS                   | Android                   |
| ------ | ---------------------------------------------------- | --------------------- | ------------------------- |
| live   | Connect to live dev server at `CAPACITOR_SERVER_URL` | `yarn cap:ios`        | `yarn cap:android`        |
| static | Build production app and output to `/build`          | `yarn cap:ios:static` | `yarn cap:android:static` |

#### Live (default)

Runs off the local Vite development server. Ideal for rapid prototyping, debugging, and hot-reloading your changes.

1. Set the development server URL
   Update your local development environment file (`.env.development.local`) by setting the following variable to the URL of your Vite dev server.

   ```sh
   CAPACITOR_SERVER_URL=http://192.168.x.x:3000
   ```

   **Note**: Use your machine's local network IP (e.g., http://192.168.x.x:3000) rather than localhost (http://localhost:3000).

2. Start the Vite development server

   ```sh
   yarn start
   ```

3. Synchronise the native project and open it in the IDE

   ```sh
   yarn cap:ios       # runs cap:sync and opens iOS project in Xcode
   yarn cap:android   # runs cap:sync and opens Android project in Android Studio
   ```

   **Notes**:
   - Make sure to run these commands again any time you change `CAPACITOR_SERVER_URL`.
   - If you see a blank screen when the app starts, then either `CAPACITOR_SERVER_URL` is wrong or you need to disable your VPN/firewall.

#### Static

Outputs the production build to `/build` and syncs capacitor to the static build output. This will test the production build output, but allow inspecting the WebView and attaching a debugger.

```sh
yarn cap:ios:static     # runs cap:sync pointing to static /build output
yarn cap:android:static # runs cap:sync pointing to static /build output
```

#### Other Scripts

- `cap:copy` – Copies the web app build and Capacitor configuration file into the native platform project. Run this each time you make changes that are not picked up by the live-reload server, and when you change a configuration value in capacitor.config.ts.
- `cap:sync` – Runs `cap:copy` and updates native Capacitor plugins.
- `cap:copy:prod` – Copies the Capacitor configuration in "release" mode. WebView is not inspectable and debugger cannot be attached.
- `cap:sync:prod` – Syncs in "release" mode.

## Deployment

em is an offline-first app that can run on a static web server.

Environment variables are set in the appropriate .env file: `.env.development` and `.env.production`. Only `.env.production` is kept in source control. Environment variables that are prepended with `VITE_` will be bundled with the build and available client-side.

```sh
# Build the static HTML/CSS/JS app in the /build directory
yarn build

# Run the static build with npx serve -s build -l 3000
yarn servebuild
```

## Component Hierarchy

To the user, a thought just consists of a bullet, text, and superscript indicating the number of contexts the thought appears in. The component hierarchy, however, consists of several components that control positioning (LayoutTree), window virtualization (VirtualThought), and superscript positioning (ThoughtAnnotation). The deep hierarchy ensures that if a thought is hidden, complex selectors and other computations are short-circuited.

```
└─Content
  └─LayoutTree
    └─VirtualThought
      └─Subthought
        └─Thought
          ├─Bullet
          └─StaticThought
            ├─ThoughtAnnotationContainer
            │ └─ThoughtAnnotation
            │   └─StaticSuperscript
            └─Editable
```

- `<Content>` - Root container that defines the margins of the thoughtspace and handles clicking on empty space.
- `<LayoutTree>` - Renders all visible thoughts as absolutely positioned siblings to allow for conditional rendering of ancestors, list virtualization, and animation across levels.
- `<VirtualThought>` - Conditionally renders a shim when the thought is hidden by autofocus. The shim is a simple div with a height attribute matching the thought's height.
- `<Subthought>`
- `<Thought>` - Renders the Bullet and the Thought.
- `<Bullet>` - This is, unsurprisingly, the bullet of the thought.
- `<StaticThought>` - Contains the Editable and ThoughtAnnotation.
- `<ThoughtAnnotationContainer>` - Conditionally renders the ThoughtAnnotation only when needed.
- `<ThoughtAnnotation>` - A non-interactive, hidden clone of the Thought that is used to position the Superscript at the end of the Thought. This is needed because the Thought has an extended click area, while the Superscript needs to be rendered flush to the right edge of the text.
- `<StaticSuperscript>` - Renders the number of contexts a thought appears in as a superscript.
- `<Editable>` - Renders the thought text as a content-editable and handles live editing, throttled updates, selection, pasting, and all other editing capacities.

## Styles

This project uses [PandaCSS](https://panda-css.com/) for styling. Styles are automatically generated from ts files at compile-time when the dev server is running.

- Prefer inline styles, e.g. `css({ margin: '10px', padding: '10px' })`
- Define recipes for complex shared styles.
- If the styles get out of sync, restart the dev server or run `panda codegen`.

See: https://panda-css.com/docs/concepts/writing-styles

## Custom Dependencies

This project uses some custom dependencies that are overridden via `resolutions` in `package.json`. The actual versions used are specified in the `resolutions` section.

### Tarball URL Format

GitHub tarball URLs follow this format:

```
https://codeload.github.com/[owner]/[repo]/tar.gz/[commit-hash]
```

Example:

- Repository: `https://github.com/magic-akari/page-lifecycle`
- Commit hash: `50b50421bdeab3d211a57e81a277f699638373b0`
- Tarball URL: `https://codeload.github.com/magic-akari/page-lifecycle/tar.gz/50b50421bdeab3d211a57e81a277f699638373b0`

### Updating Dependencies

To update these custom dependencies:

1. Check the source repository for new commits
2. Get the new commit hash
3. Update the tarball URL in the `resolutions` section of `package.json`
4. Test thoroughly as these are custom forks
