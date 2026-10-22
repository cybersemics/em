/**
 * Rewrites each preloadImage('/img/...') call in a file's source to the url() string the call returns, padded with
 * spaces to the call's length. Returns undefined when the file has no call to rewrite.
 *
 * PandaCSS reads styles from source without running it, and it cannot evaluate a call with a side effect, so it would
 * see no value for an image set with preloadImage(). The build (preloadImagePlugin) and the PandaCSS ESLint rules
 * (eslint.config.js) both read the rewritten source instead. Keeping every call's length, and matching only calls on
 * one line, means the offsets and line numbers the ESLint rules report still point at the original file.
 */
const inlinePreloadImageCalls = source =>
  source.includes('preloadImage(')
    ? source.replace(/preloadImage\([ \t]*(['"])([^'"`$\n]+)\1[ \t]*\)/g, (call, quote, path) =>
        `'url(${path})'`.padEnd(call.length),
      )
    : undefined

export default inlinePreloadImageCalls
