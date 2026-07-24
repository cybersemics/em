import { HOME_DISPLAY_VALUE, HOME_TOKEN } from '../../constants'
import removeHome from '../removeHome'

it('remove home thought', () => {
  const exported = `- ${HOME_TOKEN}
  - a
    - b
  - c`

  const expectedResult = `
- a
  - b
- c
`

  expect(removeHome(exported)).toBe(expectedResult)
})

it('do not remove first thought if it is not a home root', () => {
  const exported = `- k
  - a
    - b
  - c`

  expect(removeHome(exported)).toBe(exported)
})

it('shows the display label for a lone home root', () => {
  expect(removeHome(`- ${HOME_TOKEN}`)).toBe(`- ${HOME_DISPLAY_VALUE}`)
})

it('shows the display label for a lone home root without a bullet', () => {
  expect(removeHome(HOME_TOKEN)).toBe(HOME_DISPLAY_VALUE)
})
