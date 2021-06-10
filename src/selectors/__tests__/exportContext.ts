import { initialState, reducerFlow } from '../../util'
import { setCursor, importText } from '../../reducers'
import { HOME_PATH } from '../../constants'
import exportContext from '../exportContext'

it('test when meta and archived thoughts are included', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursor({ path: [{ value: 'a', rank: 0 }] })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain')

  expect(exported).toBe(`- a
  - =archive
    - c
  - =pin
    - true
  - b`)
})

it('test when meta is included but archived thoughts are excluded', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursor({ path: [{ value: 'a', rank: 0 }] })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeArchived: true })

  expect(exported).toBe(`- a
  - =pin
    - true
  - b`)
})

it('test when meta is excluded', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursor({ path: [{ value: 'a', rank: 0 }] })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', {
    excludeMeta: true, excludeArchived: true
  })

  expect(exported).toBe(`- a
  - b`)
})

it('test when meta is excluded but archived is included', () => {
  const text = `- a
  - =archive
    - c
  - =pin
    - true
  - b`

  const steps = [
    importText({ path: HOME_PATH, text }),
    setCursor({ path: [{ value: 'a', rank: 0 }] })
  ]

  // run steps through reducer flow and export as plaintext for readable test
  const stateNew = reducerFlow(steps)(initialState())

  const exported = exportContext(stateNew, ['a'], 'text/plain', { excludeMeta: true })

  expect(exported).toBe(`- a
  - b`)
})
