export type DurationConfig = Record<string, number>

const durationsMillis: DurationConfig = {
  highlightPulseDuration: 500,
  hoverPulseDuration: 300,
  layoutSlowShiftDuration: 750,
  layoutNodeAnimationDuration: 150,
  signaturePadOpacityDuration: 150,
  noteColorTransitionDuration: 750,
}

export default durationsMillis
