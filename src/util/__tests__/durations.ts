import durations from '../../durations.config'
import durationsHelper from '../durations'

beforeEach(() => {
  durationsHelper.setInTest(false)
})

describe('getDuration', () => {
  it('should return the correct duration when not in test state', () => {
    const [key, duration] = getTestVals()

    expect(durationsHelper.get(key)).toBe(duration)
  })

  it('should return the zero duration when in test state', () => {
    const [key] = getTestVals()

    durationsHelper.setInTest(true)
    expect(durationsHelper.get(key)).toBe(0)
  })

  it('should throw an error if the key does not exist', () => {
    expect(() => durationsHelper.get('fake-key')).toThrow(Error)
  })
})

describe('getDurations', () => {
  it('should return the correct durations when not in test state', () => {
    const actualDurations = durationsHelper.getAll()

    // SHould have same number of keys
    expect(Object.keys(actualDurations).length).toEqual(Object.keys(durations).length)

    // Each duration value should match
    Object.entries(actualDurations).forEach(([key, duration]) => {
      expect(duration).toEqual(durations[key])
    })
  })

  it('should return the zero duration when in test state', () => {
    durationsHelper.setInTest(true)
    const actualDurations = durationsHelper.getAll()

    // SHould have same number of keys
    expect(Object.keys(actualDurations).length).toEqual(Object.keys(durations).length)

    // Each duration value should match
    Object.entries(actualDurations).forEach(([, duration]) => {
      expect(duration).toEqual(0)
    })
  })
})

/** Return the first configurad duration. */
const getTestVals = (): [string, number] => {
  const keys = Object.keys(durations)

  if (keys.length === 0) throw new Error('No durations configured.')

  const key = keys[0]

  return [key, durations[key]]
}
