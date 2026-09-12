/**
 * Verifies that comparing two debug logs reports behaviour rather than text — that two runs of the same
 * steps compare equal despite sharing no ids, sequence numbers, or timestamps, and that a real behavioural
 * difference is still found and pointed at.
 *
 * Run with `npx tsx scripts/debugLogCompare.test.ts`.
 */
import assert from 'node:assert/strict'
import debugLogCompare from './debugLogCompare'

/** The comparison options the diff CLI defaults to, so the test exercises what an agent actually runs. */
const defaults = { anchor: 'session', tail: null, ignore: debugLogCompare.DEFAULT_IGNORE, mask: [] }

/** Renders one entry line the way debugLog.format() does. */
const entry = (t: string, seq: number, type: string, fields?: string): string =>
  `[${t}] +1ms #${seq} ${type}${fields ? ` ${fields}` : ''}`

/**
 * One run of "press Enter, type a, press Enter, type b", taken verbatim from a live capture and
 * parameterized by the two thought ids the run happened to generate. Two calls with different ids produce
 * the two textually disjoint blocks that motivate the whole tool.
 */
const run = ({
  day,
  seq,
  idA,
  idB,
  ua,
}: {
  /** Date portion of every timestamp, so the two runs are not merely seconds apart. */
  day: string
  /** Sequence number the run starts at. */
  seq: number
  /** Id of the first thought the run creates. */
  idA: string
  /** Id of the second thought the run creates. */
  idB: string
  /** User agent recorded in the session entry. */
  ua: string
}): string =>
  [
    entry(`${day}T12:53:22.074Z`, seq, 'session', `{"ua":"${ua}","screen":"800x600","appVersion":"351.2.0"}`),
    entry(`${day}T12:53:23.044Z`, seq + 1, 'command', '{"id":"newThought","commandType":"keyboard"}'),
    entry(`${day}T12:53:23.048Z`, seq + 2, 'action', '{"actionType":"newThought","payload":"{\\"at\\":null}"}'),
    entry(`${day}T12:53:23.197Z`, seq + 3, 'edit', '{"oldValue":"","newValue":"a","rank":0}'),
    entry(`${day}T12:53:23.201Z`, seq + 4, 'action', `{"actionType":"editThought","payload":"{\\"path\\":[\\"${idA}\\"]}"}`), // prettier-ignore
    entry(`${day}T12:53:23.201Z`, seq + 5, 'command', '{"id":"newThought","commandType":"keyboard"}'),
    entry(`${day}T12:53:23.204Z`, seq + 6, 'action', `{"actionType":"newThought","payload":"{\\"at\\":[\\"${idA}\\"]}"}`), // prettier-ignore
    entry(`${day}T12:53:23.246Z`, seq + 7, 'edit', '{"oldValue":"","newValue":"b","rank":1}'),
    entry(`${day}T12:53:23.249Z`, seq + 8, 'action', `{"actionType":"editThought","payload":"{\\"path\\":[\\"${idB}\\"]}"}`), // prettier-ignore
    entry(`${day}T12:53:23.251Z`, seq + 9, 'move', `{"id":"${idB}","oldRank":1,"newRank":0,"parentId":"00000000000000000000000000000001"}`), // prettier-ignore
  ].join('\n')

/** A reporter's log: an old run, on another device, with its own ids. */
const theirs = run({
  day: '2026-08-01',
  seq: 4102,
  idA: '97e810f0c6ba2f31736f6dac650e0cfd',
  idB: '2abb43d7e76631baf32014359b5a13d2',
  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',
})

/** A local reproduction of the same steps: different day, different sequence numbers, different ids. */
const mine = run({
  day: '2026-09-12',
  seq: 8,
  idA: '94701f3dbfb2860e757b8886868bda6e',
  idB: '57772fa97c25a845d6efa2feafa4cd44',
  ua: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/152.0.0.0 Safari/537.36',
})

/** Compares two log texts with the CLI's defaults, overridden per case. */
const compare = (theirText: string, myText: string, options: Partial<typeof defaults> = {}) =>
  debugLogCompare.compare(debugLogCompare.parse(theirText, 'theirs'), debugLogCompare.parse(myText, 'mine'), {
    ...defaults,
    ...options,
  })

/** Verifies the entry envelope is read off the line, so that entries can be compared by field rather than by text. */
const testParse = async () => {
  const log = debugLogCompare.parse(mine, 'mine')
  assert.equal(log.entries.length, 10)
  assert.equal(log.entries[1].type, 'command')
  assert.equal(log.entries[1].seq, 9)
  assert.equal(log.entries[1].dt, 1)
  assert.equal(log.entries[1].fields, '{"id":"newThought","commandType":"keyboard"}')
}

/**
 * The central case. Two runs of the same steps, sharing no thought id, no sequence number, and no timestamp,
 * must compare as identical — otherwise every comparison drowns in differences that mean nothing.
 */
const testSameBehaviourDespiteDifferentText = async () => {
  // the premise: as text, the two runs have almost nothing in common
  const sharedLines = theirs.split('\n').filter(line => mine.split('\n').includes(line))
  assert.equal(sharedLines.length, 0, 'fixture is not textually disjoint, so it proves nothing')

  const result = compare(theirs, mine)
  assert.equal(result.divergence, -1, 'two runs of the same steps diverged')
  assert.equal(result.matchedPrefix, 10)
}

/** Verifies a genuine behavioural difference is found, and reported at the entry where it happens rather than at the first line that differs textually. */
const testDivergence = async () => {
  // the reporter's second Enter produced a subthought where the local run produced a sibling
  const diverged = mine.replace('"actionType":"newThought","payload":"{\\"at\\":[\\"94701f3dbfb2860e757b8886868bda6e\\"]}"', '"actionType":"newSubthought","payload":"{\\"at\\":[\\"94701f3dbfb2860e757b8886868bda6e\\"]}"') // prettier-ignore
  assert.notEqual(diverged, mine, 'fixture substitution did not apply')

  const result = compare(theirs, diverged)
  assert.equal(result.matchedPrefix, 6, 'divergence reported at the wrong entry')
  assert.equal(result.ops?.[result.divergence].theirs?.type, 'action')

  const report = debugLogCompare.render(result, { context: 2, maxLines: 20 })
  assert.match(report, /First divergence at compared entry 7/)
  assert.match(report, /newSubthought/)
  // the reporter's entry is marked -, the local capture +
  assert.match(report, /- \[2026-08-01.*newThought/)
  assert.match(report, /\+ \[2026-09-12.*newSubthought/)
}

/** Verifies reserved thought ids are compared as themselves. They mean the same thing on every device, so canonicalizing them would discard the only ids that are directly comparable. */
const testReservedIdsSurvive = async () => {
  const ids = new Map<string, string>()
  const signature = debugLogCompare.signature(
    debugLogCompare.parse(entry('2026-09-12T00:00:00.000Z', 1, 'move', '{"id":"57772fa97c25a845d6efa2feafa4cd44","parentId":"00000000000000000000000000000001"}'), 'x').entries[0], // prettier-ignore
    ids,
    [],
  )
  assert.match(signature, /"parentId":"00000000000000000000000000000001"/, 'HOME_TOKEN was canonicalized away')
  assert.match(signature, /"id":"<id1>"/, 'a generated id was left uncanonicalized')

  // a move of HOME's child must not compare equal to a move of some other parent's child
  const other = debugLogCompare.signature(
    debugLogCompare.parse(entry('2026-09-12T00:00:00.000Z', 1, 'move', '{"id":"57772fa97c25a845d6efa2feafa4cd44","parentId":"aabb43d7e76631baf32014359b5a13d2"}'), 'x').entries[0], // prettier-ignore
    ids,
    [],
  )
  assert.notEqual(signature, other)
}

/** Verifies a log read off the console mirror parses the same as one dumped from the buffer, so either source can be compared against the other. */
const testConsoleMirrorParsesTheSame = async () => {
  const mirrored = mine
    .split('\n')
    .map(line => `debugLog ${line}`)
    .join('\n')
  assert.equal(compare(theirs, mirrored).divergence, -1, 'a console-mirrored log did not compare equal to a dump')
}

/** Verifies the non-entry parts of a format() dump — the state summary, the frame marker — are carried into the report rather than derailing the parse. */
const testStateDumpIsReportedNotParsed = async () => {
  const withDump = [
    mine,
    '--- lastFrameAt: 2026-09-12T12:53:24.000Z',
    '--- state.thoughts: 12 thoughts, 8 lexemes',
    '57772fa97c25a845d6efa2feafa4cd44 "b" rank:0 parent:00000000000000000000000000000001',
  ].join('\n')
  const log = debugLogCompare.parse(withDump, 'mine')
  assert.equal(log.entries.length, 10, 'dump lines were parsed as entries')
  assert.equal(log.stateDump, 'state.thoughts: 12 thoughts, 8 lexemes')
  assert.equal(log.lastFrameAt, 'lastFrameAt: 2026-09-12T12:53:24.000Z')
  assert.match(debugLogCompare.render(compare(theirs, withDump), { context: 2, maxLines: 20 }), /12 thoughts/)
}

/** Verifies the environments are reported side by side instead of counted as a divergence, since a session entry differs between any two devices by construction. */
const testEnvironmentIsReportedNotDiffed = async () => {
  const result = compare(theirs, mine)
  assert.equal(result.divergence, -1)
  const report = debugLogCompare.render(result, { context: 2, maxLines: 20 })
  assert.match(report, /iPhone OS 18_0/)
  assert.match(report, /HeadlessChrome/)
  assert.match(report, /appVersion.*\n.*\(same\)/, 'a field with equal values was not marked as matching')
}

/** Verifies frameGap entries are dropped by default. They measure how loaded the device was, so a reporter's phone produces many and a headless browser almost none. */
const testFrameGapIgnoredByDefault = async () => {
  const janky = mine.replace(
    entry('2026-09-12T12:53:23.197Z', 11, 'edit', '{"oldValue":"","newValue":"a","rank":0}'),
    [
      entry('2026-09-12T12:53:23.100Z', 99, 'frameGap', '{"gap":812}'),
      entry('2026-09-12T12:53:23.197Z', 11, 'edit', '{"oldValue":"","newValue":"a","rank":0}'),
    ].join('\n'),
  )
  assert.notEqual(janky, mine, 'fixture substitution did not apply')
  assert.equal(compare(theirs, janky).divergence, -1, 'a frameGap entry was treated as a behavioural difference')
  assert.notEqual(
    compare(theirs, janky, { ignore: [] }).divergence,
    -1,
    'frameGap was still dropped after --include frameGap',
  )
}

/** Verifies the comparison starts at the last session entry, so that a reporter's log covering several app launches is compared from the launch the bug happened in rather than from whatever the rolling buffer happened to retain. */
const testAnchor = async () => {
  const twoSessions = [
    entry('2026-08-01T10:00:00.000Z', 1, 'action', '{"actionType":"deleteThought","payload":"{}"}'),
    entry('2026-08-01T10:00:01.000Z', 2, 'action', '{"actionType":"archiveThought","payload":"{}"}'),
    theirs,
  ].join('\n')
  assert.equal(compare(twoSessions, mine).divergence, -1, 'entries before the last session were compared')
  assert.equal(
    compare(twoSessions, mine, { anchor: null }).matchedPrefix,
    0,
    'the earlier session was still dropped with anchoring off',
  )
}

/** Verifies an entry present in one log and absent from the other aligns as an insertion, so the entries after it still line up instead of every subsequent entry reading as changed. */
const testInsertionRealigns = async () => {
  const extra = mine.replace(
    entry('2026-09-12T12:53:23.246Z', 15, 'edit', '{"oldValue":"","newValue":"b","rank":1}'),
    [
      entry('2026-09-12T12:53:23.240Z', 98, 'keydown', '{"key":"Dead","isComposing":true}'),
      entry('2026-09-12T12:53:23.246Z', 15, 'edit', '{"oldValue":"","newValue":"b","rank":1}'),
    ].join('\n'),
  )
  assert.notEqual(extra, mine, 'fixture substitution did not apply')

  const result = compare(theirs, extra)
  const ops = result.ops
  assert.ok(ops, 'the logs were not aligned')
  assert.equal(ops.filter(op => op.kind !== 'same').length, 1, 'one extra entry produced more than one difference')
  assert.equal(ops[result.divergence].mine?.type, 'keydown')
  assert.equal(ops.at(-1)?.kind, 'same', 'the entries after the insertion did not realign')
}

/**
 * Verifies a per-device nonce is masked even when it sits inside a stringified payload. Every action's
 * payload is JSON.stringify'd before it is logged, so the field arrives escaped one level deep — masking only
 * the plain form left every initThoughts entry reading as a divergence, which is how this was found.
 */
const testMaskingReachesNestedPayloads = async () => {
  /** Renders the initThoughts entry, whose payload carries the client's nonce escaped one level deep. */
  const initThoughts = (clientId: string) =>
    entry('2026-09-12T12:53:22.500Z', 2, 'action', `{"actionType":"initThoughts","payload":"{\\"clientId\\":\\"${clientId}\\"}"}`) // prettier-ignore
  assert.match(initThoughts('x'), /\\"clientId\\"/, 'fixture is not escaped, so it proves nothing')

  /** Splices that entry into the reporter's run, after its session entry. */
  const withNonce = (clientId: string) =>
    [theirs.split('\n')[0], initThoughts(clientId), ...theirs.split('\n').slice(1)].join('\n')

  assert.equal(
    compare(withNonce('BJQKAn5PEIrh3C+/T8g6uMucxTjAEjSvmv+8hB3gTLE='), withNonce('42nf0WkeuzhJlNd9UridEt1vLxBnmH9s+y5VHb01UMk=')).divergence, // prettier-ignore
    -1,
    'a clientId nested in a payload was compared rather than masked',
  )
}

/** Verifies a file that is not a debug log is reported as such rather than compared as an empty one. */
const testNonLogInput = async () => {
  const log = debugLogCompare.parse('404: Not Found\n<html><body>nope</body></html>', 'theirs')
  assert.equal(log.entries.length, 0)
  assert.equal(log.skipped, 2)
}

await testParse()
await testSameBehaviourDespiteDifferentText()
await testDivergence()
await testReservedIdsSurvive()
await testConsoleMirrorParsesTheSame()
await testStateDumpIsReportedNotParsed()
await testEnvironmentIsReportedNotDiffed()
await testFrameGapIgnoredByDefault()
await testAnchor()
await testInsertionRealigns()
await testMaskingReachesNestedPayloads()
await testNonLogInput()

console.info('PASS: debugLogCompare')
