export type DurationConfig = Record<string, number>

const durationsMillis: DurationConfig = {
  highlightPulseDuration: 500,
  hoverPulseDuration: 300,
  layoutSlowShiftDuration: 750,
  layoutNodeAnimationDuration: 150,
  newThoughtTransitionDuration: 750,
  noteColorTransitionDuration: 750,
  signaturePadOpacityDuration: 150,
}

export default durationsMillis
