import importText from '../../actions/importText'
import initialState from '../../util/initialState'
import contextToThoughtId from '../contextToThoughtId'
import getBulletTime from '../getBulletTime'

beforeEach(() => {
  vi.useFakeTimers()
  // Time is applied at 9:47, so a list with a 15min step starts at 10:00.
  vi.setSystemTime(new Date(2026, 0, 1, 9, 47))
})

afterEach(() => {
  vi.useRealTimers()
})

it('start the list when Time was applied, rounded up to the step, and step forward through the siblings', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
              - 15min
        - Standup
        - Deep work
        - Email
    `,
  })

  const minutes = ['Standup', 'Deep work', 'Email'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Morning', value])!)!.minutes,
  )

  expect(minutes).toEqual([600, 615, 630])
})

it('do not round the start when Time was applied exactly on the step', () => {
  vi.setSystemTime(new Date(2026, 0, 1, 10, 0))

  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Standup'])!)!.minutes).toBe(600)
})

it('default to a 15min step when Time has no step', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
        - Deep work
    `,
  })

  const minutes = ['Standup', 'Deep work'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Morning', value])!)!.minutes,
  )

  expect(minutes).toEqual([600, 615])
  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Standup'])!)!.step).toBe(15)
})

it('use the step under Time', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
              - 30min
        - Standup
        - Deep work
      - Afternoon
        - =children
          - =bullet
            - Time
              - 1h
        - Email
        - Review
    `,
  })

  const morning = ['Standup', 'Deep work'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Morning', value])!)!.minutes,
  )
  const afternoon = ['Email', 'Review'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Afternoon', value])!)!.minutes,
  )

  expect(morning).toEqual([600, 630])
  expect(afternoon).toEqual([600, 660])
  expect(getBulletTime(state, contextToThoughtId(state, ['Afternoon', 'Email'])!)!.step).toBe(60)
})

it('re-base the thoughts below a =stepStart', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
              - 15min
        - Standup
        - Deep work
        - Email
        - Break
        - Review
          - =stepStart
            - 1:30 pm
        - Retro
    `,
  })

  const minutes = ['Standup', 'Deep work', 'Email', 'Break', 'Review', 'Retro'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Morning', value])!)!.minutes,
  )

  expect(minutes).toEqual([600, 615, 630, 645, 810, 825])
})

it('a =stepStart on the first thought sets the start of the list', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
          - =stepStart
            - 8:00 am
        - Deep work
    `,
  })

  const minutes = ['Standup', 'Deep work'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Morning', value])!)!.minutes,
  )

  expect(minutes).toEqual([480, 495])
})

it('parse 24-hour, 12-hour, and bare-hour =stepStart literals', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - a
          - =stepStart
            - 13:30
        - b
          - =stepStart
            - 12:15 am
        - c
          - =stepStart
            - 1pm
        - d
          - =stepStart
            - 09:05
    `,
  })

  const minutes = ['a', 'b', 'c', 'd'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Morning', value])!)!.minutes,
  )

  expect(minutes).toEqual([810, 15, 780, 545])
})

it('ignore an unparseable =stepStart', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
        - Deep work
          - =stepStart
            - noon
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Deep work'])!)!.minutes).toBe(615)
})

it('wrap past midnight', () => {
  vi.setSystemTime(new Date(2026, 0, 1, 23, 50))

  const state = importText(initialState(), {
    text: `
      - Late
        - =children
          - =bullet
            - Time
        - a
        - b
    `,
  })

  const minutes = ['a', 'b'].map(value => getBulletTime(state, contextToThoughtId(state, ['Late', value])!)!.minutes)

  expect(minutes).toEqual([0, 15])
})

it('report a 12-hour clock when a =stepStart literal has a day period', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
        - Review
          - =stepStart
            - 1:30 pm
    `,
  })

  // The clock applies to the whole list, including thoughts above the literal.
  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Standup'])!)!.hour12).toBe(true)
})

it('report a 24-hour clock when a =stepStart literal has an hour above 12 or a leading zero', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
          - =stepStart
            - 13:30
      - Evening
        - =children
          - =bullet
            - Time
        - Dinner
          - =stepStart
            - 09:00
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Standup'])!)!.hour12).toBe(false)
  expect(getBulletTime(state, contextToThoughtId(state, ['Evening', 'Dinner'])!)!.hour12).toBe(false)
})

it('report no clock when the =stepStart literals are ambiguous or absent', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
          - =stepStart
            - 1:30
        - Deep work
      - Evening
        - =children
          - =bullet
            - Time
        - Dinner
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Deep work'])!)!.hour12).toBeNull()
  expect(getBulletTime(state, contextToThoughtId(state, ['Evening', 'Dinner'])!)!.hour12).toBeNull()
})

it("report the thought's own =stepStart literal", () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
        - Review
          - =stepStart
            - 1:30 pm
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Standup'])!)!.stepStart).toBeNull()
  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Review'])!)!.stepStart).toBe('1:30 pm')
})

it('apply =grandchildren/=bullet/Time to the grandchildren', () => {
  const state = importText(initialState(), {
    text: `
      - Week
        - =grandchildren
          - =bullet
            - Time
              - 30min
        - Monday
          - Standup
          - Deep work
    `,
  })

  const minutes = ['Standup', 'Deep work'].map(
    value => getBulletTime(state, contextToThoughtId(state, ['Week', 'Monday', value])!)!.minutes,
  )

  expect(minutes).toEqual([600, 630])
  expect(getBulletTime(state, contextToThoughtId(state, ['Week', 'Monday'])!)).toBeNull()
})

it('return null for a thought outside a Time list', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Ordered
        - Standup
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', 'Standup'])!)).toBeNull()
  expect(getBulletTime(state, contextToThoughtId(state, ['Morning'])!)).toBeNull()
})

it('return null for a meta attribute in a Time list', () => {
  const state = importText(initialState(), {
    text: `
      - Morning
        - =children
          - =bullet
            - Time
        - Standup
    `,
  })

  expect(getBulletTime(state, contextToThoughtId(state, ['Morning', '=children'])!)).toBeNull()
})
