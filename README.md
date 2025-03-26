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

**em** is a highly optimized PWA that runs on native platforms using [Capacitor](https://capacitorjs.com/).

### Prerequisites

- For iOS development, ensure Xcode and CocoaPods are installed.
- For Android development, ensure Android Studio is installed.

### Development Builds

There are two types of development builds available.

#### Live Server Development Build (default)

This build runs off the local Vite development server, ideal for rapid prototyping, debugging, and hot-reloading your changes.

1. **Set the development server URL**  
   Update your local development environment file (`.env.development.local`) by setting the following variable to the URL of your Vite dev server.

   ```sh
   CAPACITOR_SERVER_URL=http://192.168.x.x:3000
   ```

   **Note**: Use your machine's local network IP (e.g., http://192.168.x.x:3000) rather than localhost (http://localhost:3000).

2. **Start the Vite development server**

   ```sh
   yarn start
   ```

3. **Synchronise the native project and open it in the IDE**

   ```sh
   yarn cap:ios       # runs cap:sync and opens iOS project in Xcode
   yarn cap:android   # runs cap:sync and opens Android project in Android Studio
   ```

   **Notes**:

   - Make sure to run these commands again any time you change `CAPACITOR_SERVER_URL`.
   - If you see a blank screen when the app starts, then either `CAPACITOR_SERVER_URL` is wrong or you need to disable your VPN/firewall.

#### Static Development Builds

Static development builds use built web code, and do not require a running Vite dev server. These are useful when you want a stable, server-independent build for testing.

```sh
yarn build              # build web code
yarn cap:ios:static     # dev build for iOS using built web code
yarn cap:android:static # dev build for Android using built web code
```

#### Production Builds

You can copy or sync in production mode with these commands:

```sh
- `cap:copy:prod`
- `cap:sync:prod`
```

#### Other Scripts

- `cap:copy` – Copies the web app build and Capacitor configuration file into the native platform project. Run this each time you make changes that are not picked up by the live-reload server, and when you change a configuration value in capacitor.config.ts.
- `cap:sync` – Runs `cap:copy` and updates native Capacitor plugins.

## Deployment

em is an offline-first app that can run on a static web server.

Environment variables are set in the appropriate .env file: `.env.development` and `.env.production`. Only `.env.production` is kept in source control. Environment variables that are prepended with `VITE_` will be bundled with the build and available client-side.

```sh
# build the static HTML/CSS/JS app in the /build directory
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
