/** Wait for a number of milliseconds. */
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export default sleep
