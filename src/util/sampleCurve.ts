/**
 * Reads a curve given as samples at x. Each sample is a row whose first value is its x; the rest are the curve's values
 * there. Between samples the values are joined with straight lines, and before the first sample or after the last they
 * hold. Returns the row at x.
 */
const sampleCurve = <N extends number[]>(curve: N[], x: number): N => {
  if (x <= curve[0][0]) return curve[0]
  const i = curve.findIndex(point => point[0] >= x)
  if (i === -1) return curve[curve.length - 1]
  const a = curve[i - 1]
  const b = curve[i]
  const p = (x - a[0]) / (b[0] - a[0])
  return a.map((v, axis) => v + (b[axis] - v) * p) as N
}

export default sampleCurve
