import stripStyleAttribute from '../stripStyleAttribute'

it('only allow font weight, font-style, and text-decoration', () => {
  expect(
    stripStyleAttribute(
      'color: red; background-color: white; font-weight: bold; font-size: 14px; font-style: italic; text-decoration: underline;',
    ),
  ).toBe('font-weight: bold;font-style: italic;text-decoration: underline;')
})

it('strip text-decoration: none', () => {
  expect(stripStyleAttribute('font-weight: bold; text-decoration: none')).toBe('font-weight: bold;')
})

it('strip font-weight: normal or 300', () => {
  expect(stripStyleAttribute('color: red; font-weight: normal')).toBe('')
  expect(stripStyleAttribute('color: red; font-weight: 300')).toBe('')
})
