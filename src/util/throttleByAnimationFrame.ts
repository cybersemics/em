/** Throttles a function by animation frame. */
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
