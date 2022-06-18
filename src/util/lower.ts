/** Guarded toLowercase. */
const lower = <T>(x: T & { toLowerCase?: () => T }) => (x && x.toLowerCase ? x.toLowerCase() : x)

export default lower
