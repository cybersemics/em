import { ROOT_TOKEN } from '../../constants'
import { removeRoot } from '../removeRoot'

it('remove root thought', () => {
  const exported = `- ${ROOT_TOKEN}
  - a
    - b
  - c`

  const expectedResult = `
- a
  - b
- c
`

  expect(removeRoot(exported)).toBe(expectedResult)
})

it('do not remove first thought if it is not a root', () => {
  const exported = `- k
  - a
    - b
  - c`

  expect(removeRoot(exported)).toBe(exported)
})
