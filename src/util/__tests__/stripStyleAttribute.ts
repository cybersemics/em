import stripStyleAttribute from '../stripStyleAttribute'

it('Allow color, background-color, font-weight, font-style, and text-decoration', () => {
  const value = 'color: red;background-color: white;font-weight: bold;font-style: italic;text-decoration: underline;'
  expect(stripStyleAttribute(value)).toBe(value)
})

it('Strip font-size', () => {
  expect(stripStyleAttribute('color: red; font-size: 14px;')).toBe('color: red;')
})

it('Strip text-decoration: none', () => {
  expect(stripStyleAttribute('color: red; text-decoration: none')).toBe('color: red;')
})

it('Strip font-weight: normal or 300', () => {
  expect(stripStyleAttribute('color: red; font-weight: normal')).toBe('color: red;')
  expect(stripStyleAttribute('color: red; font-weight: 300')).toBe('color: red;')
})
