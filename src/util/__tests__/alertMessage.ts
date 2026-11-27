import alertMessage from '../../util/alertMessage'

it('splits the message into text pieces and thought pieces', () => {
  expect(alertMessage`Drop to remove ${{ thought: 'a' }} from favorites`).toEqual([
    'Drop to remove ',
    { thought: 'a' },
    ' from favorites',
  ])
})

it('merges interpolated text into the surrounding text', () => {
  const action = 'delete'
  expect(alertMessage`Drop to ${action} ${{ thought: 'a' }}`).toEqual(['Drop to delete ', { thought: 'a' }])
})

it('drops empty text between and around thought pieces', () => {
  expect(alertMessage`${{ thought: 'a' }}${{ thought: 'b' }}`).toEqual([{ thought: 'a' }, { thought: 'b' }])
})

it('keeps the thought value as stored, without converting it to visible text', () => {
  expect(alertMessage`Removed ${{ thought: '<b>a</b>' }}`).toEqual(['Removed ', { thought: '<b>a</b>' }])
})
