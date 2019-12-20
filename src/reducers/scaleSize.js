export const scaleSize = (state, { value }) => ({
  scaleSize: Math.round(value * 10) / 10
})
