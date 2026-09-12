/**
 * Compares two **em** debug logs — typically the one a reporter attached to an issue against one captured
 * locally while reproducing it — and reports where the two runs stopped behaving the same way.
 *
 * A plain `diff` of two debug logs is worthless. Every entry carries a sequence number, a wall-clock
 * timestamp, and a millisecond delta, and every thought carries a random 128-bit id, so two runs of the
 * *same* interaction share almost no bytes.
 *
 * ```
 * #16 action {"actionType":"newThought","payload":"{\"at\":null,\"value\":\"\"}"}
 * #20 action {"actionType":"editThought","payload":"{...\"path\":[\"97e810f0…\"]…}"}
 * #56 action {"actionType":"newThought","payload":"{\"at\":null,\"value\":\"\"}"}
 * #60 action {"actionType":"editThought","payload":"{...\"path\":[\"94701f3d…\"]…}"}
 * ```
 *
 * Those two blocks are the same four keystrokes. So each entry is reduced to a **signature** — its type plus
 * its fields with the volatile parts neutralized — and the two signature streams are aligned. What survives
 * is behaviour, and the first place the two streams disagree is the lead.
 *
 * See docs/debug-log.md.
 */
import { readFileSync } from 'node:fs'

/** One parsed entry of a debug log. */
interface Entry {
  /** Monotonic sequence number the app assigned. Volatile across runs, so it is excluded from the signature. */
  seq: number
  /** Wall-clock timestamp in milliseconds. Volatile, so it is excluded from the signature. */
  t: number
  /** Milliseconds since the previous entry. Volatile, so it is excluded from the signature. */
  dt: number
  /** Short event tag, e.g. `action`, `move`, `edit`. */
  type: string
  /** The event-specific fields, as the raw JSON text that followed the type, or an empty string. */
  fields: string
  /** The line exactly as it appeared, for display. */
  line: string
}

/** A debug log parsed into entries, plus the parts of the file that are not entries. */
interface Log {
  /** Where the log was read from, for display. */
  name: string
  /** Every entry, in file order. */
  entries: Entry[]
  /** Lines that matched no known shape. A handful is normal (console noise, the state dump); a large count means the file is not a debug log. */
  skipped: number
  /** The environment fields of the last `session` entry — user agent, screen, mode, app version, commit hash. */
  session: Record<string, unknown> | null
  /** The `--- state.thoughts: N thoughts, M lexemes` summary that format() appends, if present. */
  stateDump: string | null
  /** The `--- lastFrameAt:` marker that format() appends, if present. */
  lastFrameAt: string | null
}

/** One step of an alignment between two entry streams. */
interface Op {
  /** Whether both sides matched, or which side carries the unmatched entry. */
  kind: 'same' | 'theirs' | 'mine'
  /** The entry from the reporter's log, when this step has one. */
  theirs?: Entry
  /** The entry from the locally captured log, when this step has one. */
  mine?: Entry
}

/** Everything the comparison found, ready to render. */
interface Comparison {
  /** The reporter's log, after anchoring and trimming. */
  theirs: Log
  /** The locally captured log, after anchoring and trimming. */
  mine: Log
  /** The alignment, or null when both streams were too long to align (see MAX_ALIGN_CELLS). */
  ops: Op[] | null
  /** Index into `ops` of the first step that is not a match, or -1 when the two streams are identical. */
  divergence: number
  /** How many leading entries matched before the streams disagreed. */
  matchedPrefix: number
}

/** Options that control what counts as a difference. */
interface CompareOptions {
  /** Entry type whose last occurrence starts the comparison window in each log, or null to compare from the top. */
  anchor: string | null
  /** Keep only this many entries from the end of each log, or null for all of them. */
  tail: number | null
  /** Entry types to drop before comparing. */
  ignore: string[]
  /** Extra JSON field names whose values are masked before comparing. */
  mask: string[]
}

/**
 * Matches one rendered entry: `[<ISO timestamp>] +<dt>ms #<seq> <type> <fields JSON>`.
 *
 * A leading `.*?` tolerates whatever precedes the line — the `debugLog` prefix the console mirror adds, or a
 * console listing's own timestamp and level column — so a log pasted out of a browser console parses the same
 * as one dumped from the buffer. Requiring an ISO date inside the brackets keeps that leniency from matching
 * unrelated text.
 */
const ENTRY_REGEX = /^.*?\[(\d{4}-\d{2}-\d{2}T[^\]]*)\]\s+\+(-?\d+)ms\s+#(\d+)\s+(\S+)(?:\s+(\{.*\}))?\s*$/

/** Matches a thought id: 32 lowercase hex characters (see src/util/createId.ts). */
const ID_REGEX = /\b[0-9a-f]{32}\b/g

/**
 * Matches a reserved thought id — GLOBAL_ROOT_TOKEN, HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN, SETTINGS_TOKEN,
 * TRANSIENT_THOUGHT_ID (src/constants.ts). All of them carry at least 24 leading zeros, which a random
 * 128-bit id does with probability 16^-24, so these are left alone: they mean the same thing in both logs and
 * canonicalizing them would throw away the only ids that are directly comparable.
 */
const RESERVED_ID_REGEX = /^0{24}/

/** JSON field names whose values differ between any two runs by construction, and so are masked rather than compared. `clientId` and `updatedBy` are per-device nonces; `lastUpdated` is a wall-clock stamp. */
const VOLATILE_FIELDS = ['clientId', 'updatedBy', 'lastUpdated']

/** Entry types dropped by default. `frameGap` fires on an anomalous gap between animation frames, so it reports how loaded the device was rather than what the app did — abundant on a reporter's phone and near-absent in a headless browser. */
const DEFAULT_IGNORE = ['frameGap']

/** Largest alignment problem to attempt, in cells of the dynamic-programming table. Beyond this the full diff is skipped and the first divergence, which needs only a linear scan, is reported on its own. */
const MAX_ALIGN_CELLS = 4_000_000

/** Longest entry line rendered in a report, so that one enormous updateThoughts payload cannot crowd out the rest. */
const LINE_MAX_LENGTH = 240

/** Parses the text of a debug log — as written by debugLog.format(), or read off the console mirror — into entries, ignoring any line that is not one. */
const parse = (text: string, name: string): Log => {
  const lines = text.split('\n')

  const entries = lines.flatMap(line => {
    const match = line.match(ENTRY_REGEX)
    if (!match) return []
    const [, iso, dt, seq, type, fields] = match
    return [{ seq: Number(seq), t: Date.parse(iso), dt: Number(dt), type, fields: fields ?? '', line }]
  })

  // The last session entry describes the environment the log was captured in. It is the single most useful
  // thing to put in front of whoever is comparing: a log from iOS Safari two app versions back explains a
  // divergence that no amount of entry-by-entry reading would.
  const lastSession = entries.filter(entry => entry.type === 'session').at(-1)
  const session = lastSession?.fields ? (JSON.parse(lastSession.fields) as Record<string, unknown>) : null

  return {
    name,
    entries,
    skipped: lines.filter(line => line.trim() && !ENTRY_REGEX.test(line)).length,
    session,
    stateDump: lines.find(line => line.startsWith('--- state.thoughts:'))?.replace('--- ', '') ?? null,
    lastFrameAt: lines.find(line => line.startsWith('--- lastFrameAt:'))?.replace('--- ', '') ?? null,
  }
}

/**
 * Reduces an entry to the part of it that is about behaviour: its type, and its fields with every value that
 * cannot survive a second run replaced by a placeholder.
 *
 * Thought ids are numbered by first appearance **within their own log**, so the nth distinct thought either
 * log creates gets the same placeholder in both. That is what makes two runs of the same steps compare equal
 * despite sharing no ids. `ids` accumulates that numbering across the whole log and is therefore mutated.
 */
const signature = (entry: Entry, ids: Map<string, string>, mask: string[]): string => {
  // A session entry records the user agent, screen size, app version and commit hash, which differ between
  // any two devices. Comparing them entry-by-entry would report a divergence on the very first line of every
  // comparison; they are reported side by side in the header instead.
  if (entry.type === 'session') return 'session'

  // Two patterns per field, because an action's payload is stringified before it is logged, so the same field
  // appears both plainly (`"clientId":"…"`) and escaped one level deep (`\"clientId\":\"…\"`). Masking only
  // the plain form leaves every initThoughts entry reading as a divergence on a nonce.
  const masked = [...VOLATILE_FIELDS, ...mask].reduce(
    (text, field) =>
      text
        .replace(new RegExp(`"${field}":("[^"]*"|-?\\d+)`, 'g'), `"${field}":<masked>`)
        .replace(new RegExp(`\\\\"${field}\\\\":(\\\\"[^\\\\"]*\\\\"|-?\\d+)`, 'g'), `\\"${field}\\":<masked>`),
    entry.fields,
  )

  const canonical = masked.replace(ID_REGEX, id => {
    if (RESERVED_ID_REGEX.test(id)) return id
    const existing = ids.get(id)
    if (existing) return existing
    const placeholder = `<id${ids.size + 1}>`
    ids.set(id, placeholder)
    return placeholder
  })

  return `${entry.type} ${canonical}`
}

/** Narrows a log to the window worth comparing: everything from the last occurrence of the anchor type onwards, minus the ignored types, minus everything before the last `tail` entries. */
const narrow = (log: Log, { anchor, tail, ignore }: CompareOptions): Log => {
  const anchorIndex = anchor ? log.entries.map(entry => entry.type).lastIndexOf(anchor) : -1
  const anchored = anchorIndex >= 0 ? log.entries.slice(anchorIndex) : log.entries
  const kept = anchored.filter(entry => !ignore.includes(entry.type))
  return { ...log, entries: tail === null ? kept : kept.slice(-tail) }
}

/**
 * Aligns two signature streams by longest common subsequence, returning null when the streams are too long
 * to align within MAX_ALIGN_CELLS.
 *
 * Common prefixes and suffixes are stripped first, which is what makes this tractable in practice: two runs
 * of the same steps usually agree for a long way and then disagree in one place, so the table only ever
 * covers the disputed middle. The table itself is an Int32Array rather than nested arrays — at the cap that
 * is 16 MB contiguous instead of millions of boxed numbers.
 */
const align = (theirs: Entry[], mine: Entry[], theirSigs: string[], mySigs: string[]): Op[] | null => {
  const prefixLength = theirSigs.findIndex((sig, i) => i >= mySigs.length || sig !== mySigs[i])
  const head = prefixLength < 0 ? Math.min(theirSigs.length, mySigs.length) : prefixLength

  const maxSuffix = Math.min(theirSigs.length, mySigs.length) - head
  let suffix = 0
  while (suffix < maxSuffix && theirSigs[theirSigs.length - 1 - suffix] === mySigs[mySigs.length - 1 - suffix]) {
    suffix += 1
  }

  const a = theirSigs.slice(head, theirSigs.length - suffix)
  const b = mySigs.slice(head, mySigs.length - suffix)
  if (a.length * b.length > MAX_ALIGN_CELLS) return null

  // Standard longest-common-subsequence table. A loop rather than a fold: each cell reads the two cells above
  // and to the left, so the computation is inherently sequential over a mutable buffer.
  const width = b.length + 1
  const table = new Int32Array((a.length + 1) * width)
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1])
    }
  }

  const middle: Op[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      middle.push({ kind: 'same', theirs: theirs[head + i], mine: mine[head + j] })
      i += 1
      j += 1
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      middle.push({ kind: 'theirs', theirs: theirs[head + i] })
      i += 1
    } else {
      middle.push({ kind: 'mine', mine: mine[head + j] })
      j += 1
    }
  }

  return [
    ...theirs.slice(0, head).map((entry, k): Op => ({ kind: 'same', theirs: entry, mine: mine[k] })),
    ...middle,
    // Whatever the backtrack did not consume, bounded by the stripped suffix — slicing to the end here would
    // emit the suffix entries a second time, once as unmatched and again as the matching tail below.
    ...theirs.slice(head + i, theirs.length - suffix).map((entry): Op => ({ kind: 'theirs', theirs: entry })),
    ...mine.slice(head + j, mine.length - suffix).map((entry): Op => ({ kind: 'mine', mine: entry })),
    ...theirs.slice(theirs.length - suffix).map((entry, k): Op => ({
      kind: 'same',
      theirs: entry,
      mine: mine[mine.length - suffix + k],
    })),
  ]
}

/** Compares two logs and reports where they stop agreeing. */
const compare = (theirsLog: Log, mineLog: Log, options: CompareOptions): Comparison => {
  const theirs = narrow(theirsLog, options)
  const mine = narrow(mineLog, options)

  // Each log gets its own id numbering, so that the nth distinct thought in one is comparable with the nth in
  // the other. Sharing one map across both would make every id in the second log a fresh placeholder.
  const theirIds = new Map<string, string>()
  const myIds = new Map<string, string>()
  const theirSignatures = theirs.entries.map(entry => signature(entry, theirIds, options.mask))
  const mySignatures = mine.entries.map(entry => signature(entry, myIds, options.mask))

  const firstMismatch = theirSignatures.findIndex((sig, i) => i >= mySignatures.length || sig !== mySignatures[i])
  const matchedPrefix = firstMismatch < 0 ? Math.min(theirSignatures.length, mySignatures.length) : firstMismatch

  const ops = align(theirs.entries, mine.entries, theirSignatures, mySignatures)
  const divergence = ops ? ops.findIndex(op => op.kind !== 'same') : -1

  return { theirs, mine, ops, divergence, matchedPrefix }
}

/** Truncates a rendered line so that one oversized payload cannot crowd out the rest of the report. */
const truncate = (line: string): string =>
  line.length > LINE_MAX_LENGTH ? `${line.slice(0, LINE_MAX_LENGTH)}…(+${line.length - LINE_MAX_LENGTH})` : line

/** Renders one alignment step with the marker that says which log it came from. */
const renderOp = (op: Op): string =>
  op.kind === 'same'
    ? `    ${truncate(op.theirs!.line)}`
    : op.kind === 'theirs'
      ? `  - ${truncate(op.theirs!.line)}`
      : `  + ${truncate(op.mine!.line)}`

/** Renders the environment each log was captured in, side by side, from the last session entry of each. */
const renderEnvironment = (theirs: Log, mine: Log): string[] => {
  if (!theirs.session && !mine.session) return []
  const keys = [...new Set([...Object.keys(theirs.session ?? {}), ...Object.keys(mine.session ?? {})])]
  return [
    '',
    'Environment (last session entry)',
    ...keys.flatMap(key => {
      const theirValue = String(theirs.session?.[key] ?? '—')
      const myValue = String(mine.session?.[key] ?? '—')
      return [
        `  ${key.padEnd(12)} theirs  ${truncate(theirValue)}`,
        `  ${''.padEnd(12)} mine    ${truncate(myValue)}${theirValue === myValue ? '  (same)' : ''}`,
      ]
    }),
  ]
}

/** Renders the entry types that occur in one log and not the other — often the whole answer on its own, as when a reporter's log carries composition entries that a desktop reproduction never produces. */
const renderTypeGap = (theirs: Log, mine: Log): string[] => {
  /** Counts how many entries of each type a log carries. */
  const count = (log: Log): Map<string, number> =>
    log.entries.reduce((acc, entry) => acc.set(entry.type, (acc.get(entry.type) ?? 0) + 1), new Map())
  const theirTypes = count(theirs)
  const myTypes = count(mine)
  /** Renders the types counted in the first log that the second never produced. */
  const only = (a: Map<string, number>, b: Map<string, number>): string =>
    [...a]
      .filter(([type]) => !b.has(type))
      .map(([type, n]) => `${type} (${n})`)
      .join(', ') || '—'
  return ['', 'Entry types in only one log', `  theirs only  ${only(theirTypes, myTypes)}`, `  mine only    ${only(myTypes, theirTypes)}`] // prettier-ignore
}

/** Renders the comparison as a bounded plain-text report. */
const render = (
  { theirs, mine, ops, divergence, matchedPrefix }: Comparison,
  { context, maxLines }: { context: number; maxLines: number },
): string => {
  const header = [
    'Debug log comparison',
    `  theirs  ${theirs.name}  ${theirs.entries.length} entries compared, ${theirs.skipped} lines skipped`,
    `  mine    ${mine.name}  ${mine.entries.length} entries compared, ${mine.skipped} lines skipped`,
    ...(theirs.stateDump || mine.stateDump
      ? ['', 'Final state', `  theirs  ${theirs.stateDump ?? '—'}`, `  mine    ${mine.stateDump ?? '—'}`]
      : []),
    // A frame marker later than the last entry means the page kept painting after logging stopped, which
    // puts a freeze below the app rather than in it. Worth surfacing wherever a log carries one.
    ...(theirs.lastFrameAt || mine.lastFrameAt
      ? ['', 'Last animation frame', `  theirs  ${theirs.lastFrameAt ?? '—'}`, `  mine    ${mine.lastFrameAt ?? '—'}`]
      : []),
    ...renderEnvironment(theirs, mine),
    ...renderTypeGap(theirs, mine),
  ]

  if (!ops) {
    return [
      ...header,
      '',
      `The two logs agree for their first ${matchedPrefix} entries.`,
      'They are too long to align in full — narrow the window with --tail or --anchor for an entry-by-entry diff.',
    ].join('\n')
  }

  if (divergence < 0) {
    return [...header, '', `No divergence. All ${ops.length} compared entries match.`].join('\n')
  }

  const divergent = ops[divergence]
  const body = [
    '',
    `First divergence at compared entry ${divergence + 1} of ${ops.length}` +
      ` (theirs #${divergent.theirs?.seq ?? '—'}, mine #${divergent.mine?.seq ?? '—'})`,
    '  - is the reporter’s log, + is the local capture',
    '',
    ...ops.slice(Math.max(0, divergence - context), divergence).map(renderOp),
    ...ops.slice(divergence).slice(0, maxLines).map(renderOp),
  ]

  const shown = ops.length - Math.max(0, divergence - context)
  return [
    ...header,
    ...body,
    ...(shown > maxLines + context ? ['', `  …${ops.length - divergence - maxLines} further steps not shown.`] : []),
  ].join('\n')
}

/** Reads a log file from disk and parses it. */
const read = (path: string): Log => parse(readFileSync(path, 'utf8'), path)

/** Compares two **em** debug logs by behaviour rather than by text. See docs/debug-log.md. */
const debugLogCompare = { DEFAULT_IGNORE, align, compare, parse, read, render, signature }

export default debugLogCompare
