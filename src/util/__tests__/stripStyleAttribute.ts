import stripStyleAttribute from '../stripStyleAttribute'

it.skip('only allowed properties', () => {
  expect(stripStyleAttribute('color: red; font-weight: bold')).toBe('color: red;font-weight: bold;')
})

it.skip('allowed properties and font-size', () => {
  expect(stripStyleAttribute('color: red; font-weight: bold; font-size: 14px')).toBe('color: red;font-weight: bold;')
})

it.skip('allowed properties and font-weight: normal', () => {
  expect(stripStyleAttribute('color: red; font-weight: bold; font-style: normal')).toBe('color: red;font-weight: bold;')
})

it.skip('with black color and no background, should not include color property', () => {
  expect(stripStyleAttribute('color: black;')).toBe('')
})

it.skip('with white color and no background, should not include color property', () => {
  expect(stripStyleAttribute('color: white;')).toBe('')
})

it.skip('with black color and yellow background', () => {
  expect(stripStyleAttribute('color: black; background: yellow')).toBe('color: black;background: yellow;')
})

it.skip('with white background and no color, should not include background property', () => {
  expect(stripStyleAttribute('background: white')).toBe('')
})

it('with all allowed style properties', () => {
  expect(stripStyleAttribute('text-decoration: underline;font-weight: bold;font-style: italic;')).toBe(
    'text-decoration: underline;font-weight: bold;font-style: italic;',
  )
})

it('with only font-weight', () => {
  expect(stripStyleAttribute('font-weight: bold;')).toBe('font-weight: bold;')
})

it('with  font-weight and a not allowed property, should not include color', () => {
  expect(stripStyleAttribute('font-weight: bold; color: red')).toBe('font-weight: bold;')
})
