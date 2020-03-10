let t1 = Date.now() // eslint-disable-line fp/no-let

export const measureTime = () => {
  const t2 = Date.now()
  const diff = (t2 - t1) / 1000
  t1 = t2
  return diff
}
