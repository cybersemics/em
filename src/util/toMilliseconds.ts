/** Converts strings to milliseconds based on the units in the string. Treats unitless strings as milliseconds. */
const toMilliseconds = (str: string) =>
  str.endsWith('ms') ? parseInt(str, 10) : str.endsWith('s') ? parseInt(str, 10) * 1000 : parseInt(str, 10)

export default toMilliseconds
