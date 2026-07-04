import { describe, expect, it } from 'vitest'
import { TRUSTED_ASSOCIATIONS, parseEstimateCommand, roundToNearestCategory, sampleFilename } from '../command.ts'

describe('parseEstimateCommand', () => {
  it('parses commands with h suffix', () => {
    expect(parseEstimateCommand('/estimate 4h')).toBe(4)
    expect(parseEstimateCommand('/estimate 1h')).toBe(1)
    expect(parseEstimateCommand('/estimate 48h')).toBe(48)
  })

  it('parses commands without h suffix', () => {
    expect(parseEstimateCommand('/estimate 4')).toBe(4)
    expect(parseEstimateCommand('/estimate 8')).toBe(8)
    expect(parseEstimateCommand('/estimate 16')).toBe(16)
  })

  it('handles surrounding whitespace', () => {
    expect(parseEstimateCommand('/estimate 4h ')).toBe(4)
    expect(parseEstimateCommand('  /estimate 4h  ')).toBe(4)
  })

  it('rejects invalid commands', () => {
    expect(parseEstimateCommand('not a command')).toBeNull()
    expect(parseEstimateCommand('/estimate')).toBeNull()
    expect(parseEstimateCommand('/estimate abc')).toBeNull()
    expect(parseEstimateCommand('/estimate -1h')).toBeNull()
  })
})

describe('roundToNearestCategory', () => {
  it('returns exact valid hours for standard values', () => {
    expect(roundToNearestCategory(1)).toBe(1)
    expect(roundToNearestCategory(2)).toBe(2)
    expect(roundToNearestCategory(4)).toBe(4)
    expect(roundToNearestCategory(8)).toBe(8)
    expect(roundToNearestCategory(16)).toBe(16)
    expect(roundToNearestCategory(24)).toBe(24)
    expect(roundToNearestCategory(48)).toBe(48)
  })

  it('rounds non-standard hours to nearest valid value', () => {
    expect(roundToNearestCategory(10)).toBe(8) // 10 is closest to 8
    expect(roundToNearestCategory(50)).toBe(48) // 50 rounds to 48
    expect(roundToNearestCategory(0)).toBe(1) // 0 rounds to 1
    expect(roundToNearestCategory(20)).toBe(16) // 20 is closer to 16 than 24
  })
})

describe('sampleFilename', () => {
  it('generates correct filename', () => {
    expect(sampleFilename(123)).toBe('issue-123.json')
    expect(sampleFilename(4001)).toBe('issue-4001.json')
  })
})

describe('TRUSTED_ASSOCIATIONS', () => {
  it('includes expected associations', () => {
    expect(TRUSTED_ASSOCIATIONS).toContain('OWNER')
    expect(TRUSTED_ASSOCIATIONS).toContain('MEMBER')
    expect(TRUSTED_ASSOCIATIONS).toContain('COLLABORATOR')
  })

  it('excludes untrusted associations', () => {
    expect(TRUSTED_ASSOCIATIONS).not.toContain('CONTRIBUTOR')
    expect(TRUSTED_ASSOCIATIONS).not.toContain('NONE')
    expect(TRUSTED_ASSOCIATIONS).not.toContain('FIRST_TIME_CONTRIBUTOR')
  })
})
