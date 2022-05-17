/** Starts a timer. Returns an object with a measure method to return the formatted number of seconds elapsed. */
const time = () => {
  const t = Date.now()
  return {
    measure: () => {
      return (Date.now() - t) / 1000
    },
  }
}

export default time
