# Help Genie Architecture

Diagrams of how the help genie's modules fit together, for reasoning about changes to it. What the genie is, its state, and how it behaves are described in [learning.md → Help genie](learning.md#help-genie). All paths below are under [`src/components/HelpGenie`](../src/components/HelpGenie) unless noted.

## How it connects to the app

Redux holds what the app wants from the genie: whether it is out, where it has been sent, and whether it can run. The buttons and any other module change that state through actions; `HelpGenie` reads it. The genie's motion never goes through Redux.

```mermaid
flowchart TB
  subgraph Callers["Who changes it"]
    DialogHeader["DialogHeader<br/>Command Universe Help button"]
    Tooltip["PinnedCommandTooltip<br/>learning genie button"]
    Other["Any other module"]
  end

  subgraph Redux["Redux: state.helpGenie"]
    toggle["toggleHelpGenie<br/>sets visible"]
    move["moveHelpGenie<br/>sets target"]
    disable["disableHelpGenie<br/>sets unavailable"]
  end

  subgraph Genie["The genie"]
    App["AppComponent"] -- "mounts" --> HelpGenie["HelpGenie<br/>overlay"]
    HelpGenie -- "lazy import,<br/>only when out" --> GenieCanvas["GenieCanvas<br/>Pixi canvas"]
  end

  DialogHeader --> toggle
  Tooltip --> toggle
  Other --> move
  toggle -- "visible" --> HelpGenie
  move -- "target" --> HelpGenie
  HelpGenie -. "no WebGL, or a<br/>load or render failure" .-> disable
  disable -. "disables the<br/>genie buttons" .-> Callers
```

## Modules

Each part of the genie has a folder holding its maths and its drawing. The pure modules have no Pixi or React and are unit-tested; the components draw with Pixi. The layers depend only on the frame and the constants, never on each other, except that the sparkles use the trail's width to stay inside it.

```mermaid
flowchart TB
  HelpGenie["HelpGenie.tsx<br/>overlay: Redux, WebGL check, error boundary"]
  GenieCanvas["GenieCanvas.tsx<br/>Pixi canvas and frame loop"]
  stepGenie["stepGenie.ts<br/>advances the whole genie one frame"]
  genieMotion["genieMotion.ts<br/>spring and remembered positions"]
  GenieFrame["GenieFrame.ts<br/>everything that changes per frame"]
  constants["constants.ts<br/>every tuned value"]

  subgraph halo["halo/"]
    GenieHalo["GenieHalo.tsx"]
    haloShape["haloShape.ts<br/>where the glow sits and its points"]
    shaders["halo.vert, halo.frag<br/>color of each pixel"]
  end

  subgraph trail["trail/"]
    GenieTrail["GenieTrail.tsx"]
    flightPath["flightPath.ts<br/>smooth curve through positions"]
    trailWidth["trailWidth.ts<br/>width along the trail"]
  end

  subgraph sparkles["sparkles/"]
    GenieSparkles["GenieSparkles.tsx"]
    sparklesTs["sparkles.ts<br/>birth and expiry"]
  end

  HelpGenie -- "lazy" --> GenieCanvas
  GenieCanvas --> stepGenie
  GenieCanvas --> GenieHalo
  GenieCanvas --> GenieTrail
  GenieCanvas --> GenieSparkles
  stepGenie --> genieMotion
  stepGenie --> sparklesTs
  GenieHalo --> haloShape
  GenieHalo --> shaders
  GenieTrail --> flightPath
  GenieTrail --> trailWidth
  GenieSparkles --> trailWidth

  classDef pure fill:#e8f1e8,stroke:#5a8a5a,color:#1a2e1a
  classDef pixi fill:#ece8f4,stroke:#7a6a9a,color:#241c33
  class stepGenie,genieMotion,haloShape,flightPath,trailWidth,sparklesTs,GenieFrame,constants pure
  class GenieCanvas,GenieHalo,GenieTrail,GenieSparkles,shaders pixi
```

Green modules are pure TypeScript; purple ones draw with Pixi. `GenieFrame` and `constants` are used by nearly every module, so their arrows are left out.

em's standards allow one default export per file, and a component file may export only components, so a helper shared between two files needs a file of its own. Helpers used by one component stay inside it, like `trailColor` and `ribbonQuad` in `GenieTrail`. The separate files are there for one of two reasons:

- **Shared:** `trailWidth` is used by the trail and the sparkles; `sparkles.ts` by `stepGenie` and, through the frame, `GenieSparkles`.
- **Tested:** `flightPath`, `haloShape`, `genieMotion`, and `stepGenie` hold the least obvious maths, and a function must be exported to be unit-tested.

## One frame

Every frame runs the same pipeline on Pixi's ticker. `GenieCanvas` steps the genie first, at high priority, so all three layers draw the same frame; then each layer draws it. The frame lives in one ref in `GenieCanvas`, and the layers only read it.

```mermaid
sequenceDiagram
  participant Input as Pointer / moveHelpGenie
  participant Canvas as GenieCanvas (high priority)
  participant Step as stepGenie
  participant Halo as GenieHalo
  participant Trail as GenieTrail
  participant Sparkles as GenieSparkles
  participant GPU

  Input->>Canvas: latest target
  Canvas->>Step: last frame, target, dt
  Step->>Step: genieMotion: move head, remember position
  Step->>Step: update heading
  Step->>Step: sparkles: birth and expiry
  Step-->>Canvas: next frame
  Canvas->>Halo: frame
  Halo->>Halo: haloShape: center, stretch, points
  Halo->>GPU: points to halo.frag, which colors each pixel
  Canvas->>Trail: frame
  Trail->>Trail: flightPath, trailWidth: ribbon and core
  Trail->>GPU: ribbon, blurred and screen-blended
  Canvas->>Sparkles: frame
  Sparkles->>Sparkles: each sparkle's position and fade at its age
  Sparkles->>GPU: one batch, color-dodged
```

The steps up to each arrow into the GPU run in JavaScript on the CPU: deciding where things go, a few hundred numbers a frame. The GPU turns them into pixels, which is the heavy part.
