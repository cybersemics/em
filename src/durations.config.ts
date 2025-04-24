/** Animation durations that are imported into the panda config. See recipes/fadeTransition for corresponding FadeTransition animations. */
const durationsConfig = {
  /* GENERAL ANIMATIONS */
  /* A slow animation that intentionally lags behind user interaction, such as autofocus. Gives the transition the appearance of going at its own pace. Only use in special circumstances. */
  slow: 750,
  /* A medium duration animation that provides a noticeable transition. Good for large user interface elements that slide or fade in. Do not use for animations of very small UI elements are those traveling a very short distance. */
  medium: 400,
  /* A fast animation that the user will barely notice, but still represents a state change. Snappy.  */
  fast: 200,
  /* A very fast animation that is near instantaneous, such as a toggle. */
  veryFast: 80,

  /* PULSE ANIMATIONS */
  /** A very slow pulse animation. */
  verySlowPulse: 1000,
  /** A slow pulse animation. */
  slowPulse: 500,
  /** A medium pulse animation. */
  mediumPulse: 300,

  /* SPECIFIC ANIMATIONS */
  /** The time it takes the HUD to fade out when the user starts typing on desktop. */
  distractionFreeTyping: 600,
  distractionFreeTypingThrottle: 100,
  /** The animation duration for the slower opacity transition and horizontal shift of the LayoutTree as the depth of the cursor changes. */
  layoutSlowShift: 750,
  /** The animation duration of a node in the LayoutTree component. This animates thought positions when they are moved. */
  layoutNodeAnimation: 150,
  /* A fade in animation that is triggered for new thoughts. */
  nodeFadeIn: 150,
  /* A fade out animation that is triggered when a node unmounts. See autofocusChanged for normal opacity animations. */
  nodeFadeOut: 80,
  /* A dissolve animation that is triggered when a node is deleted. */
  nodeDissolve: 80,
  /* TraceGesture needs to fade in medium-fast so that it does not appear for quickly entered gestures like → and ←, but is snappy otherwise. */
  traceGestureIn: 300,
} as const

export default durationsConfig
