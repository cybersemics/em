import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'

describe('sample schema validation', () => {
  const samplesDir = path.join(process.cwd(), '.github/instructions/estimate/samples')

  it('all sample files are valid JSON with correct schema', () => {
    if (!fs.existsSync(samplesDir)) return

    const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      const content = fs.readFileSync(path.join(samplesDir, file), 'utf-8')
      const sample = JSON.parse(content)

      // Required fields
      expect(sample).toHaveProperty('input')
      expect(sample.input).toHaveProperty('title')
      expect(sample.input).toHaveProperty('body')
      expect(sample.input).toHaveProperty('labels')
      expect(Array.isArray(sample.input.labels)).toBe(true)
      expect(sample).toHaveProperty('expected')
      expect(['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']).toContain(sample.expected)
    }
  })

  it('sample filenames follow naming convention', () => {
    if (!fs.existsSync(samplesDir)) return

    const files = fs.readdirSync(samplesDir).filter(f => f.endsWith('.json'))
    for (const file of files) {
      expect(file).toMatch(/^issue-\d+(-\w+)?\.json$/)
    }
  })
})

describe('estimate command parsing', () => {
  /** Parses /estimate command from comment body. Returns hours or null. */
  const parseEstimateCommand = (body: string): number | null => {
    const match = body.trim().match(/^\/estimate\s+(\d+)h\s*$/)
    if (!match) return null
    return parseInt(match[1], 10)
  }

  it('parses valid commands', () => {
    expect(parseEstimateCommand('/estimate 4h')).toBe(4)
    expect(parseEstimateCommand('/estimate 1h')).toBe(1)
    expect(parseEstimateCommand('/estimate 48h')).toBe(48)
  })

  it('handles whitespace', () => {
    expect(parseEstimateCommand('/estimate 4h ')).toBe(4)
    expect(parseEstimateCommand(' /estimate 4h')).toBe(4)
  })

  it('rejects invalid commands', () => {
    expect(parseEstimateCommand('not a command')).toBeNull()
    expect(parseEstimateCommand('/estimate')).toBeNull()
    expect(parseEstimateCommand('/estimate abc')).toBeNull()
    expect(parseEstimateCommand('/estimate 4')).toBeNull()
  })

  it('generates correct sample filename', () => {
    /** Generates a deterministic sample filename for an issue. */
    const sampleFilename = (issueNumber: number): string => `issue-${issueNumber}.json`
    expect(sampleFilename(123)).toBe('issue-123.json')
    expect(sampleFilename(4001)).toBe('issue-4001.json')
  })
})

describe('trusted commenter guard', () => {
  const TRUSTED_ASSOCIATIONS = ['OWNER', 'MEMBER', 'COLLABORATOR']

  it('allows trusted associations', () => {
    expect(TRUSTED_ASSOCIATIONS.includes('OWNER')).toBe(true)
    expect(TRUSTED_ASSOCIATIONS.includes('MEMBER')).toBe(true)
    expect(TRUSTED_ASSOCIATIONS.includes('COLLABORATOR')).toBe(true)
  })

  it('rejects untrusted associations', () => {
    expect(TRUSTED_ASSOCIATIONS.includes('CONTRIBUTOR')).toBe(false)
    expect(TRUSTED_ASSOCIATIONS.includes('NONE')).toBe(false)
    expect(TRUSTED_ASSOCIATIONS.includes('FIRST_TIME_CONTRIBUTOR')).toBe(false)
  })
})

describe('empty body skip behavior', () => {
  it('should identify empty bodies', () => {
    /** Returns true if the body should be skipped. */
    const shouldSkip = (body: string | null): boolean => !body
    expect(shouldSkip(null)).toBe(true)
    expect(shouldSkip('')).toBe(true)
    expect(shouldSkip('Some content')).toBe(false)
  })
})
