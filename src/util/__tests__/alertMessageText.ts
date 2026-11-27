import alertMessage from '../../util/alertMessage'
import alertMessageText from '../../util/alertMessageText'

it('joins the pieces into plain text', () => {
  expect(alertMessageText(alertMessage`Drop to remove ${{ thought: 'a' }} from favorites`)).toBe(
    'Drop to remove a from favorites',
  )
})

it('converts thought values to visible text', () => {
  expect(alertMessageText(alertMessage`Removed ${{ thought: '<b>Tom</b> &amp; Jerry' }} from favorites`)).toBe(
    'Removed Tom & Jerry from favorites',
  )
})
