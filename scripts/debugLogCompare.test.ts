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

/** Renders one entry line the way debugLog.format() does: the time of day, then the type, which for an action includes its actionType (`action newThought`). */
const entry = (time: string, seq: number, type: string, fields?: string): string =>
  `${time} +1ms #${seq} ${type}${fields ? ` ${fields}` : ''}`

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
  /** Date of the run, written as its `--- date` line, so the two runs are not merely seconds apart. */
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
    `--- date: ${day}`,
    entry('12:53:22.074', seq, 'session', `{"ua":"${ua}","screen":"800x600","appVersion":"351.2.0"}`),
    entry('12:53:23.044', seq + 1, 'command', '{"id":"newThought","commandType":"keyboard"}'),
    entry('12:53:23.048', seq + 2, 'action newThought', '{"at":null}'),
    entry('12:53:23.197', seq + 3, 'edit', '{"oldValue":"","newValue":"a","rank":0}'),
    entry('12:53:23.201', seq + 4, 'action editThought', `{"path":["${idA}"]}`),
    entry('12:53:23.201', seq + 5, 'command', '{"id":"newThought","commandType":"keyboard"}'),
    entry('12:53:23.204', seq + 6, 'action newThought', `{"at":["${idA}"]}`),
    entry('12:53:23.246', seq + 7, 'edit', '{"oldValue":"","newValue":"b","rank":1}'),
    entry('12:53:23.249', seq + 8, 'action editThought', `{"path":["${idB}"]}`),
    entry('12:53:23.251', seq + 9, 'move', `{"id":"${idB}","oldRank":1,"newRank":0,"parentId":"00000000000000000000000000000001"}`), // prettier-ignore
  ].join('\n')

/** A reporter's log: an old run, on another device, with its own ids. */
const theirs = run({
  day: '2026-08-01',
  seq: 4102,
  idA: '97e810f0c6',
  idB: '2abb43d7e7',
  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1',
})

/** A local reproduction of the same steps: different day, different sequence numbers, different ids. */
const mine = run({
  day: '2026-09-12',
  seq: 8,
  idA: '94701f3dbf',
  idB: '57772fa97c',
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
  assert.equal(log.entries[1].label, null)
  // the date is carried forward from the `--- date` line, since each entry carries only the time of day
  assert.equal(log.entries[1].t, Date.parse('2026-09-12T12:53:23.044Z'))
  // an action's actionType is read as its label
  assert.equal(log.entries[2].type, 'action')
  assert.equal(log.entries[2].label, 'newThought')
  assert.equal(log.entries[2].fields, '{"at":null}')
  assert.equal(log.skipped, 0, 'the date line was counted as unrecognized')
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
  const diverged = mine.replace('action newThought {"at":["94701f3dbf"]}', 'action newSubthought {"at":["94701f3dbf"]}')
  assert.notEqual(diverged, mine, 'fixture substitution did not apply')

  const result = compare(theirs, diverged)
  assert.equal(result.matchedPrefix, 6, 'divergence reported at the wrong entry')
  assert.equal(result.ops?.[result.divergence].theirs?.type, 'action')

  const report = debugLogCompare.render(result, { context: 2, maxLines: 20 })
  assert.match(report, /First divergence at compared entry 7/)
  assert.match(report, /newSubthought/)
  // the reporter's entry is marked -, the local capture +
  assert.match(report, /- 12:53:23\.204 .*#4108 action newThought/)
  assert.match(report, /\+ 12:53:23\.204 .*#14 action newSubthought/)
}

/** Verifies reserved thought ids are compared as themselves. They mean the same thing on every device, so canonicalizing them would discard the only ids that are directly comparable. */
const testReservedIdsSurvive = async () => {
  const ids = new Map<string, string>()
  const signature = debugLogCompare.signature(
    debugLogCompare.parse(entry('00:00:00.000', 1, 'move', '{"id":"57772fa97c","parentId":"00000000000000000000000000000001"}'), 'x').entries[0], // prettier-ignore
    ids,
    [],
  )
  assert.match(signature, /"parentId":"00000000000000000000000000000001"/, 'HOME_TOKEN was canonicalized away')
  assert.match(signature, /"id":"<id1>"/, 'a generated id was left uncanonicalized')

  // a move of HOME's child must not compare equal to a move of some other parent's child
  const other = debugLogCompare.signature(
    debugLogCompare.parse(entry('00:00:00.000', 1, 'move', '{"id":"57772fa97c","parentId":"aabb43d7e7"}'), 'x').entries[0], // prettier-ignore
    ids,
    [],
  )
  assert.notEqual(signature, other)
}

/** Verifies a log read off the console mirror parses the same as one dumped from the buffer, so either source can be compared against the other. */
const testConsoleMirrorParsesTheSame = async () => {
  /** Prefixes every line the way a console listing shows a mirrored one: its own level and timestamp column, then the mirror's prefix. */
  const mirror = (prefix: string) =>
    mine
      .split('\n')
      .map(line => `${prefix}${line}`)
      .join('\n')
  ;['debugLog ', '[info] 2026-09-12 12:53:23 debugLog '].forEach(prefix => {
    const log = debugLogCompare.parse(mirror(prefix), 'mine')
    assert.equal(log.skipped, 0, `a mirrored line was not recognized behind ${JSON.stringify(prefix)}`)
    assert.equal(log.entries[0].t, Date.parse('2026-09-12T12:53:22.074Z'), 'the mirrored date line was not read')
    assert.equal(
      compare(theirs, mirror(prefix)).divergence,
      -1,
      'a console-mirrored log did not compare equal to a dump',
    )
  })
}

/** Verifies the non-entry parts of a format() dump — the state summary, the frame marker — are carried into the report rather than derailing the parse. */
const testStateDumpIsReportedNotParsed = async () => {
  const withDump = [
    mine,
    '--- lastFrameAt: 2026-09-12T12:53:24.000Z',
    '--- state.thoughts: 12 thoughts, 8 lexemes',
    '57772fa97c "b" rank:0 parent:00000000000000000000000000000001',
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
    entry('12:53:23.197', 11, 'edit', '{"oldValue":"","newValue":"a","rank":0}'),
    [
      entry('12:53:23.100', 99, 'frameGap', '{"gap":812}'),
      entry('12:53:23.197', 11, 'edit', '{"oldValue":"","newValue":"a","rank":0}'),
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
    entry('10:00:00.000', 1, 'action deleteThought'),
    entry('10:00:01.000', 2, 'action archiveThought'),
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
    entry('12:53:23.246', 15, 'edit', '{"oldValue":"","newValue":"b","rank":1}'),
    [
      entry('12:53:23.240', 98, 'keydown', '{"key":"Dead","isComposing":true}'),
      entry('12:53:23.246', 15, 'edit', '{"oldValue":"","newValue":"b","rank":1}'),
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
 * Verifies a per-device nonce is masked both where format() writes it — plainly, among the fields it parsed out
 * of the payload — and inside a payload the field cap cut, which no longer parses and so stays a string with the
 * field escaped one level deep.
 */
const testMaskingReachesNestedPayloads = async () => {
  /** Renders the initThoughts entry carrying the client's nonce, plainly or inside a payload string that was cut. */
  const initThoughts = (clientId: string, cut: boolean) =>
    entry('12:53:22.500', 2, 'action initThoughts', cut ? `{"payload":"{\\"clientId\\":\\"${clientId}\\",\\"x\\":\\"…(+12)"}` : `{"clientId":"${clientId}"}`) // prettier-ignore
  assert.match(initThoughts('x', true), /\\"clientId\\"/, 'fixture is not escaped, so it proves nothing')

  /** Splices that entry into the reporter's run, after its date line and session entry. */
  const withNonce = (clientId: string, cut: boolean) =>
    [...theirs.split('\n').slice(0, 2), initThoughts(clientId, cut), ...theirs.split('\n').slice(2)].join('\n')

  ;[false, true].forEach(cut => {
    assert.equal(
      compare(withNonce('BJQKAn5PEIrh3C+/T8g6uMucxTjAEjSvmv+8hB3gTLE=', cut), withNonce('42nf0WkeuzhJlNd9UridEt1vLxBnmH9s+y5VHb01UMk=', cut)).divergence, // prettier-ignore
      -1,
      `a clientId ${cut ? 'escaped in a cut payload' : 'among the fields'} was compared rather than masked`,
    )
  })
}

/**
 * Verifies a damaged session entry costs the environment header rather than the whole comparison. The input
 * is a file downloaded from an issue attachment, so it is the one input that must never be trusted to parse.
 */
const testDamagedSessionEntry = async () => {
  const damaged = entry('12:53:22.074', 8, 'session', '{"ua":"Mozilla/5.0", "screen":}')
  const withDamaged = [mine.split('\n')[0], damaged, ...mine.split('\n').slice(2)].join('\n')
  const log = debugLogCompare.parse(withDamaged, 'mine')
  assert.equal(log.session, null, 'a damaged session entry was not tolerated')
  assert.equal(log.entries.length, 10, 'the rest of the log was lost with it')
  assert.equal(compare(theirs, withDamaged).divergence, -1)
}

/**
 * Verifies the state dump is not counted as unparsed. It is one line per thought, so a real thoughtspace would
 * report hundreds of skipped lines — burying the count that tells the reader a download returned something
 * other than a debug log.
 */
const testStateDumpIsNotCountedAsSkipped = async () => {
  const thoughts = Array.from(
    { length: 300 },
    (_, i) => `aa${String(i).padStart(8, '0')} "t${i}" rank:${i} parent:00000000000000000000000000000001`,
  )
  const log = debugLogCompare.parse([mine, '--- state.thoughts: 300 thoughts, 300 lexemes', ...thoughts].join('\n'), 'mine') // prettier-ignore
  assert.equal(log.skipped, 0, 'the state dump was counted as unparsed lines')
  assert.equal(log.stateDump, 'state.thoughts: 300 thoughts, 300 lexemes')

  // a genuinely unrecognized line before the dump still counts, since that is the signal worth keeping
  const noisy = debugLogCompare.parse(['404: Not Found', mine, '--- state.thoughts: 1 thoughts, 1 lexemes', 'x'].join('\n'), 'mine') // prettier-ignore
  assert.equal(noisy.skipped, 1)
}

/**
 * Verifies the environment is read from format()'s `---` header, which is written at format time, in
 * preference to the session entry, which is an ordinary entry the rolling buffer evicts once capacity is
 * exceeded. A reporter's full buffer is exactly the case where only the header survives.
 */
const testEnvironmentPrefersTheFormatHeader = async () => {
  const header = [
    '--- device: iPhone (ios), 390x844, touch',
    '--- userAgent: Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148',
    '--- version: 349.1.0',
    '--- commit: abc1234',
    '--- display: standalone, portrait-primary, dpr 3, scale 1, safe-area-bottom 34',
    '--- url: https://em.org/~/home',
    '--- evicted: 3 earlier entries',
  ]

  // a long log whose session entry has been evicted, leaving only the header
  const lines = theirs.split('\n')
  const evicted = debugLogCompare.parse([...header, lines[0], ...lines.slice(2)].join('\n'), 'theirs')
  assert.equal(evicted.entries.filter(e => e.type === 'session').length, 0, 'fixture still has a session entry')
  assert.equal(evicted.session?.version, '349.1.0')
  assert.equal(evicted.session?.device, 'iPhone (ios), 390x844, touch')
  assert.equal(evicted.session?.display, 'standalone, portrait-primary, dpr 3, scale 1, safe-area-bottom 34')
  assert.equal(evicted.session?.url, 'https://em.org/~/home')
  assert.equal(evicted.skipped, 0, 'the header was counted as unrecognized')

  // the session fields the header restates are dropped, so each fact is reported once rather than twice
  assert.equal(evicted.session?.ua, undefined, 'the session ua survived alongside the header userAgent')
  assert.equal(evicted.session?.appVersion, undefined, 'the session appVersion survived alongside the header version')

  // an excerpt read off the console mirror carries no header, so it still reports its session entry
  assert.match(String(debugLogCompare.parse(theirs, 'theirs').session?.ua), /iPhone/)

  assert.match(
    debugLogCompare.render(debugLogCompare.compare(evicted, debugLogCompare.parse(mine, 'mine'), defaults), {
      context: 2,
      maxLines: 20,
    }),
    /349\.1\.0/,
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
await testDamagedSessionEntry()
await testStateDumpIsNotCountedAsSkipped()
await testEnvironmentPrefersTheFormatHeader()
await testNonLogInput()

console.info('PASS: debugLogCompare')
