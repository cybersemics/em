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

## Native App Development

**em** is a highly optimized PWA that runs on native platforms using [Capacitor](https://capacitorjs.com/). To get started, run `yarn cap:ios` or `yarn cap:android`.

Scripts:

- `cap:ios` - Generates iOS project files with capacitor and opens the project in XCode. Requires XCode and CocoaPods to be installed. Choose your device target and hit Play in XCode to build and run the app.
- `cap:android` - Generates Android project files with capacitor and opens the project in Android Studio.
- `cap:copy` - Copies the web app build and capacitor configuration file into the native platform project. Run this each time you make changes that are not picked up by the live-reload server, and when you change a configuration value in capacitor.config.ts.
- `cap:sync` - Runs cap:copy and updates native capacitor plugins.

The above scripts run in development mode by default. You can copy or sync in production mode with these:

- `cap:copy:prod`
- `cap:sync:prod`

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

Root containers:

Each thought consists of many layers of components that provide various functionalities. This is necessary from a performance perspective to avoid re-rendering all thought components when a small slice changes, when a thought falls outside the viewport and can be virtualized.

```
└─Content
  └─LayoutTree
    └─LayoutShim
      └─VirtualThought
        └─ThoughtContainer
          ├─Bullet
          └─StaticThought
            ├─ThoughtAnnotation
            │ └─StaticSuperscript
            └─Editable
            │ └─Superscript
```

- `<Content>` - Root container that defines the margins of the thoughtspace and handles clicking on empty space.
- `<LayoutTree>` - Renders all visible thoughts as absolutely positioned siblings to allow for conditional rendering of ancestors, list virtualization, and cross-hierarchy animation.
- `<VirtualThought>` - Conditionally renders a shim when the thought is hidden by autofocus. The shim is a simple div with a height attribute matching the thought's height.
- `<ThoughtContainer>` - Contains the Bullet, ThoughtAnnotation, and StaticThought for a single thought.
- `<Bullet>` - This is, unsurprisingly, the bullet of the thought.
- `<StaticThought>` - Contains the Editable and ThoughtAnnotation.
- `<ThoughtAnnotation>` - A non-interactive, hidden clone of the Thought that is used to position the Superscript.
- `<Editable>` - Renders the thought text as a content-editable and handles live editing, throttled updates, selection, pasting, and all other editing capacities.
