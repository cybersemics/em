/**
 * Tests for the JSONL corpus loader.
 *
 * The corpus is the ruler every accuracy figure is measured against, so a loader that drops a line
 * or mangles one does not produce an error — it produces a slightly different number that nobody can
 * trace. These check that it reads what was written and complains usefully when it cannot.
 */
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import loadSamples, { type Sample } from '../loadSamples.ts'

const written: string[] = []

/** Writes lines to a temporary JSONL file and returns its path. */
const corpus = (lines: string[]): string => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'samples-')), 'samples.jsonl')
  fs.writeFileSync(file, lines.join('\n'))
  written.push(file)
  return file
}

/** One sample, as a JSON line. */
const line = (issue: number, over: Partial<Sample> = {}): string =>
  JSON.stringify({
    input: { title: `issue ${issue}`, body: 'body', labels: ['bug'] },
    expected: '📐 Layout',
    split: 'train',
    source: { type: 'github', issue },
    ...over,
  })

afterEach(() => {
  for (const file of written.splice(0)) fs.rmSync(path.dirname(file), { recursive: true, force: true })
})

describe('loadSamples', () => {
  it('reads one sample per line, in file order', () => {
    const samples = loadSamples(corpus([line(3), line(1), line(2)]))
    expect(samples.map(sample => sample.source!.issue)).toEqual([3, 1, 2])
  })

  it('tolerates a trailing newline, which every editor adds', () => {
    expect(loadSamples(corpus([line(1), line(2), ''])).length).toBe(2)
  })

  it('ignores blank lines rather than parsing them as samples', () => {
    expect(loadSamples(corpus([line(1), '', '  ', line(2)])).length).toBe(2)
  })

  it('names the offending line when one does not parse', () => {
    // Bisecting a corrupt line by hand is the thing this message exists to prevent.
    expect(() => loadSamples(corpus([line(1), '{ not json', line(3)]))).toThrow(/samples\.jsonl line 2/)
  })

  it('returns nothing for a file that does not exist', () => {
    expect(loadSamples(path.join(os.tmpdir(), 'no-such-corpus.jsonl'))).toEqual([])
  })

  it('preserves the fields the harness grades on', () => {
    const [sample] = loadSamples(corpus([line(7, { expected: null, split: 'test' })]))
    expect(sample).toMatchObject({ expected: null, split: 'test', source: { issue: 7 } })
    expect(sample.input.labels).toEqual(['bug'])
  })
})
