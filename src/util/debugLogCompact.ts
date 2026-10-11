/**
 * The compaction debugLog.format() applies to each entry on export, shared with scripts/debugLogCompare.ts so that a
 * log exported before compaction existed can be brought into the same form before two logs are compared. Pure and
 * import-free, so the comparison script can load it without the app.
 *
 * The log is read only by agents, so every transformation here trades nothing an agent needs for fewer tokens. See
 * docs/debug-log.md.
 */

/** Number of leading characters a thought id is cut to on export. At 10 hex characters, two of the ~2000 distinct ids a full buffer carries share a prefix with a probability of about one in a million. */
const SHORT_ID_LENGTH = 10

/** Matches a full thought id: 32 lowercase hex characters (see src/util/createId.ts). */
const ID_REGEX = /\b[0-9a-f]{32}\b/g

/** Matches a reserved thought id — HOME_TOKEN, EM_TOKEN and the rest (src/constants.ts), all of which carry at least 24 leading zeros. These are kept whole: they are short in tokens and mean the same thing on every device. */
const RESERVED_ID_REGEX = /^0{24}/

/** Shortens every non-reserved thought id in the text to its first SHORT_ID_LENGTH characters. */
const shortenIds = (text: string): string =>
  text.replace(ID_REGEX, id => (RESERVED_ID_REGEX.test(id) ? id : id.slice(0, SHORT_ID_LENGTH)))

/** Drops the fields that carry nothing an agent needs, recursively: `isComposing: false`, the default; `value` when it only repeats a reserved id; and the `label` and `source` of commandMetadata, which repeat its commandId. */
const prune = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(prune)
  if (!value || typeof value !== 'object') return value
  const obj = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(obj)
      .filter(
        ([key, child]) =>
          !(key === 'isComposing' && child === false) &&
          !(key === 'value' && child === obj.id && typeof child === 'string' && RESERVED_ID_REGEX.test(child)),
      )
      .map(([key, child]) => {
        if (key !== 'commandMetadata' || !child || typeof child !== 'object') return [key, prune(child)]
        const { label: _label, source: _source, ...rest } = child as Record<string, unknown>
        return [key, prune(rest)]
      }),
  )
}

/**
 * Compacts the fields of one entry. An `action` entry's actionType is returned as a label for the envelope, and its
 * payload — stringified when it was logged, so that the field cap bounds it in storage — is parsed back and spread
 * into the fields, which removes a level of escaping from every key. A payload that does not parse (one cut by the
 * field cap) or is not an object stays a `payload` string. Idempotent, so already compacted fields pass through.
 */
const compactFields = (type: string, fields: Record<string, unknown>): { label: string | null; fields: object } => {
  if (type !== 'action' || typeof fields.actionType !== 'string')
    return { label: null, fields: prune(fields) as object }
  const { actionType, payload, ...rest } = fields
  const parsed = ((): unknown => {
    if (typeof payload !== 'string') return undefined
    try {
      return JSON.parse(payload)
    } catch {
      return undefined
    }
  })()
  const spread =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : payload !== undefined
        ? { payload }
        : {}
  return { label: actionType, fields: prune({ ...rest, ...spread }) as object }
}

/** The compaction debugLog.format() applies on export. See the module comment. */
const debugLogCompact = {
  compactFields,
  shortenIds,
  SHORT_ID_LENGTH,
}

export default debugLogCompact
