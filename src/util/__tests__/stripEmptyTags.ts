import { stripEmptyFormattingTags } from '../stripEmptyFormattingTags'

it('empty tags with no content', () => {
  expect(stripEmptyFormattingTags('<b></b>')).toBe('')
})

it('empty tags with spaces as content', () => {
  expect(stripEmptyFormattingTags('<b>  </b>')).toBe('')
})

it('empty tags with nested br tags', () => {
  expect(stripEmptyFormattingTags('<b> <br> <br> </b>')).toBe('')
})

it('tags with content', () => {
  expect(stripEmptyFormattingTags('<b> b </b>')).toBe('<b> b </b>')
})
