import formatTime from '../formatTime'

it('formats a morning time the same on a 12-hour and a 24-hour clock', () => {
  expect(formatTime(600, { hour12: true })).toBe('10:00')
  expect(formatTime(600, { hour12: false })).toBe('10:00')
})

it('formats an afternoon time as 1:30 on a 12-hour clock and 13:30 on a 24-hour clock', () => {
  expect(formatTime(810, { hour12: true })).toBe('1:30')
  expect(formatTime(810, { hour12: false })).toBe('13:30')
})

it('zero-pads the hour on a 24-hour clock only', () => {
  expect(formatTime(540, { hour12: true })).toBe('9:00')
  expect(formatTime(540, { hour12: false })).toBe('09:00')
})

it('formats midnight as 12:00 on a 12-hour clock and 00:00 on a 24-hour clock', () => {
  expect(formatTime(0, { hour12: true })).toBe('12:00')
  expect(formatTime(0, { hour12: false })).toBe('00:00')
})

it('appends the day period to a 12-hour time when dayPeriod is set', () => {
  expect(formatTime(600, { hour12: true, dayPeriod: true })).toBe('10:00 am')
  expect(formatTime(810, { hour12: true, dayPeriod: true })).toBe('1:30 pm')
  expect(formatTime(0, { hour12: true, dayPeriod: true })).toBe('12:00 am')
  expect(formatTime(720, { hour12: true, dayPeriod: true })).toBe('12:00 pm')
})

it('does not append a day period to a 24-hour time', () => {
  expect(formatTime(810, { hour12: false, dayPeriod: true })).toBe('13:30')
})

it('wraps past midnight in both directions', () => {
  expect(formatTime(1455, { hour12: false })).toBe('00:15')
  expect(formatTime(-15, { hour12: false })).toBe('23:45')
})
