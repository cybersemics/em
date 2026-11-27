import type { AlertPart } from '../@types/Alert'

/**
 * A tagged template that builds an alert message from pieces. Interpolate a thought value as `{ thought: value }` so that
 * AlertMessage can shrink it with an ellipsis, and the surrounding text stays visible. Adjacent text is merged, and empty
 * text is dropped.
 *
 * @example
 * alertMessage`Drop to remove ${{ thought: value }} from favorites`
 * // ['Drop to remove ', { thought: value }, ' from favorites']
 */
const alertMessage = (strings: TemplateStringsArray, ...values: AlertPart[]): AlertPart[] =>
  strings
    .flatMap((text, i) => (i < values.length ? [text, values[i]] : [text]))
    .reduce<AlertPart[]>((parts, part) => {
      const last = parts[parts.length - 1]
      return part === ''
        ? parts
        : typeof part === 'string' && typeof last === 'string'
          ? [...parts.slice(0, -1), last + part]
          : [...parts, part]
    }, [])

export default alertMessage
