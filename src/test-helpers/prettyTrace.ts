/** Prints a readable stack trace that omits vendor scripts and Redux middleware. */
const prettyTrace = (message?: string) => {
  const err = new Error()
  console.warn(
    // opening "Error" line is needed for the browser to detect this as a stack trace and use source maps
    err.stack
      // 687xx:137 - multi.ts
      ?.replace(/\n.*at http:\/\/localhost:3000\/static\/js\/main.chunk.js:(687\d\d):137+/g, '')
      .replace(/\n.*at http:\/\/localhost:3000\/static\/js\/vendors[^\n]+/g, '')
      .replace(/\n.*at (prettyTrace|itForEach|dispatch|Object\.dispatch|MessagePort\.callback)[^\n]+/g, ''),
  )
}

export default prettyTrace
