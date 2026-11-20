import fuzzyWordMatch from '../fuzzyWordMatch'

it('matches a contiguous substring anywhere in the label', () => {
  expect(fuzzyWordMatch('New Subthought', 'thought')).toEqual([7, 8, 9, 10, 11, 12, 13])
})

it('matches characters that jump to the starts of words', () => {
  expect(fuzzyWordMatch('New Thought', 'net')).toEqual([0, 1, 4])
  expect(fuzzyWordMatch('Context View', 'cv')).toEqual([0, 8])
})

it('treats a character after punctuation as the start of a word', () => {
  expect(fuzzyWordMatch('New Thought (above)', 'nta')).toEqual([0, 4, 13])
})

it('does not match characters that jump into the middle of a word', () => {
  expect(fuzzyWordMatch('Close Command Center', 'net')).toBeNull()
  expect(fuzzyWordMatch('Context View', 'xv')).toBeNull()
})

it('ignores spaces in the query', () => {
  expect(fuzzyWordMatch('New Thought', 'new th')).toEqual([0, 1, 2, 4, 5])
})

it('backtracks when the first word start it tries leads to a dead end', () => {
  // the t of "Toggle" is tried first, but only the t of "Table" is followed by an a
  expect(fuzzyWordMatch('Toggle Table View', 'tav')).toEqual([7, 8, 13])
})
