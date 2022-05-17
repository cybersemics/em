import chalk from 'chalk'

/** Starts a timer. Returns an object with a measure method to return the formatted number of seconds elapsed and a print method. */
const time = () => {
  const t = Date.now()

  // API
  const measure = () => (Date.now() - t) / 1000
  const print = () => `(${chalk.yellow(measure() + 's')})`

  return {
    measure,
    print,
  }
}

export default time
