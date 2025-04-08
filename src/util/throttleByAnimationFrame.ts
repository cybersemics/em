/** Throttles a function by animation frame. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const throttleByAnimationFrame = <T>(f: (...args: any) => void) => {
  let wait = false
  return (...args: T[]) => {
    if (wait) return
    wait = true
    requestAnimationFrame(() => {
      wait = false
    })
    f(...args)
  }
}

export default throttleByAnimationFrame
