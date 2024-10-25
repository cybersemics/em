const durationsMillis = {
  /* GENERAL ANIMATIONS */
  /* A slow animation that intentionally lags behind user interaction, such as autofocus. Gives the transition the appearance of going at its own pace. Only use in special circumstances. */
  slowDuration: 750,
  /* A medium duration animation that provides a noticeable transition. Good for large user interface elements that slide or fade in. Do not use for animations of very small UI elements are those traveling a very short distance. */
  mediumDuration: 400,
  /* A fast animation that the user will barely notice, but still represents a state change. Snappy.  */
  fastDuration: 200,
  /* A very fast animation that is near instantaneous, such as a toggle. */
  veryFastDuration: 80,

  /* PULSE ANIMATIONS */
  /** A slow pulse animation. */
  slowPulseDuration: 500,
  /** A medium pulse animation. */
  mediumPulseDuration: 300,

  /* SPECIFIC ANIMATIONS */
  /** The time it takes the HUD to fade out when the user starts typing on desktop. */
  distractionFreeTypingDuration: 600,
  /** The animation duration for the slower opacity transition and horizontal shift of the LayoutTree as the depth of the cursor changes. */
  layoutSlowShiftDuration: 750,
  /** The animation duration of a node in the LayoutTree component. This animates thought positions when they are moved. */
  layoutNodeAnimationDuration: 150,
  /** The time it takes the trace TraceGesture to fade in/out. */
  traceOpacityDuration: 150,
  arrowBobbleAnimation: 1000,
} as const

export default durationsMillis
