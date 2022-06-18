import { HOME_TOKEN } from '../../constants'
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
