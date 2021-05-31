import stripStyleAttribute from '../stripStyleAttribute'

it('only allowed properties', () => {
  expect(stripStyleAttribute('color: red; font-weight: bold')).toBe('color: red;font-weight: bold;')
})

it('allowed properties and font-size', () => {
  expect(stripStyleAttribute('color: red; font-weight: bold; font-size: 14px')).toBe('color: red;font-weight: bold;')
})

it('allowed properties and font-weight: normal', () => {
  expect(stripStyleAttribute('color: red; font-weight: bold; font-style: normal')).toBe('color: red;font-weight: bold;')
})

it('with black color and no background, should not include color property', () => {
  expect(stripStyleAttribute('color: black;')).toBe('')
})

it('with white color and no background, should not include color property', () => {
  expect(stripStyleAttribute('color: white;')).toBe('')
})

it('with black color and yellow background', () => {
  expect(stripStyleAttribute('color: black; background: yellow')).toBe('color: black;background: yellow;')
})

it('with white background and no color, should not include background property', () => {
  expect(stripStyleAttribute('background: white')).toBe('')
})
