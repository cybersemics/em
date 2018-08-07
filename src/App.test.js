import React from 'react'
import ReactDOM from 'react-dom'
import { App, checkinWithDecay, readyToDecay, expandRows, STATE_RED, STATE_YELLOW, STATE_GREEN, STATE_NULL } from './App'

const allDaysOfWeek = [true, true, true, true, true, true, true]

// it('renders without crashing', () => {
//   const div = document.createElement('div')
//   ReactDOM.render(<App />, div)
//   ReactDOM.unmountComponentAtNode(div)
// })

describe('readyToDecay', () => {

  it('ready to decay from checkin', () => {
    expect(readyToDecay([
      { state: STATE_GREEN },
      { state: STATE_GREEN },
      { state: STATE_GREEN, checkin: true },
      { state: STATE_GREEN }
    ], 3))
      .toEqual(true)
  })

  it('ready to decay from previous decay', () => {
    expect(readyToDecay([
      { state: STATE_YELLOW },
      { state: STATE_GREEN, checkin: true }
    ], 1))
      .toEqual(true)
  })

  it('too recent checkin not ready to decay', () => {
    expect(readyToDecay([
      { state: STATE_GREEN },
      { state: STATE_GREEN },
      { state: STATE_GREEN, checkin: true },
      { state: STATE_GREEN }
    ], 4))
      .toEqual(false)

    expect(readyToDecay([
      { state: STATE_GREEN, checkin: true },
      { state: STATE_GREEN },
      { state: STATE_GREEN },
      { state: STATE_GREEN, checkin: true }
    ], 2))
      .toEqual(false)
  })

  it('already decayed checkin not ready to decay', () => {
    expect(readyToDecay([
      { state: STATE_YELLOW },
      { state: STATE_GREEN },
      { state: STATE_GREEN },
      { state: STATE_GREEN, checkin: true}
    ], 3))
      .toEqual(false)
  })

  it('does not decay from red', () => {
    expect(readyToDecay([{ state: STATE_RED }], 1))
      .toEqual(false)
  })

  it('does not decay from null', () => {
    expect(readyToDecay([{ state: STATE_NULL }], 1))
      .toEqual(false)
  })

  it('does not decay after redundant checkin', () => {
    expect(readyToDecay([
      { state: STATE_GREEN, checkin: true },
      { state: STATE_GREEN, checkin: true }
    ], 2))
      .toEqual(false)
  })

})

describe('checkinWithDecay', () => {

  it('repeats checkin with no decay', () => {
    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_RED }], 0, allDaysOfWeek))
      .toEqual(STATE_RED)

    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_YELLOW }], 0, allDaysOfWeek))
      .toEqual(STATE_YELLOW)

    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_GREEN }], 0, allDaysOfWeek))
      .toEqual(STATE_GREEN)

    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_NULL }], 0, allDaysOfWeek))
      .toEqual(STATE_NULL)
  })

  it('decays to correct state', () => {
    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_GREEN }], 1, allDaysOfWeek))
      .toEqual(STATE_YELLOW)
    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_YELLOW }], 1, allDaysOfWeek))
      .toEqual(STATE_RED)
    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_RED }], 1, allDaysOfWeek))
      .toEqual(STATE_RED)
    expect(checkinWithDecay([{ date: '2018-07-23', state: STATE_NULL }], 1, allDaysOfWeek))
      .toEqual(STATE_NULL)
  })

  it('decays to correct state after several days', () => {
    expect(checkinWithDecay([
      { date: '2018-07-25', state: STATE_GREEN, checkin: true },
      { date: '2018-07-24', state: STATE_YELLOW },
      { date: '2018-07-23', state: STATE_YELLOW }
    ], 2, allDaysOfWeek))
      .toEqual(STATE_GREEN)
  })

  it('does not decay on non-decay days of the week', () => {
    // no decay on Sat
    expect(checkinWithDecay([{ date: '2018-07-21'/*Sunday*/, state: STATE_GREEN }], 1, [true, true, true, true, true, true, false]))
      .toEqual(STATE_GREEN)

    // no decay on Sun
    expect(checkinWithDecay([{ date: '2018-07-22'/*Sunday*/, state: STATE_GREEN }], 1, [false, true, true, true, true, true, true]))
      .toEqual(STATE_GREEN)
  })

})

describe('expandRows', () => {

  it('expands rows right-to-left from startDate filling in gaps', () => {
    expect(expandRows([
      {
        checkins: {
          '2018-07-23': {
            date: '2018-07-23',
            state: STATE_GREEN,
            note: 'NOTE'
          }
        },
        decay: 1,
        label: 'LABEL'
      }
    ], '2018-07-22', allDaysOfWeek, '2018-07-25')).toEqual([{
      label: 'LABEL',
      decay: 1,
      checkins: [
        { date: '2018-07-25', state: STATE_RED },
        { date: '2018-07-24', state: STATE_YELLOW },
        { date: '2018-07-23', checkin: true, state: STATE_GREEN, note: 'NOTE' }
      ]
    }])
  })

})
