import { act } from 'react'
import { addAllMulticursorActionCreator as addAllMulticursor } from '../../actions/addAllMulticursor'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import { addMulticursorAtFirstMatchActionCreator as addMulticursorAtFirstMatch } from '../../test-helpers/addMulticursorAtFirstMatch'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Set Lower Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="LowerCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - hello everyone, this is rose. thanks for your help.`)
})

it('Set Upper Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - HELLO EVERYONE, THIS IS ROSE. THANKS FOR YOUR HELP.`)
})

it('Set Sentence Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="SentenceCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - Hello everyone, this is rose. Thanks for your help.`)
})

it('Set Title Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="TitleCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - Hello Everyone, This Is Rose. Thanks for Your Help.`)
})

it('Set Upper Case with multicursor selection', async () => {
  await dispatch([
    newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' }),
    newThought({ value: 'Goodbye everyone, this is Max. Thanks for your help.' }),
    addAllMulticursor({}),
  ])
  expect(Object.keys(store.getState().multicursors)).toHaveLength(2)
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - HELLO EVERYONE, THIS IS ROSE. THANKS FOR YOUR HELP.
  - GOODBYE EVERYONE, THIS IS MAX. THANKS FOR YOUR HELP.`)
})

// https://github.com/cybersemics/em/issues/4840
it('multicursor selection is preserved after applying Upper Case', async () => {
  await dispatch([
    newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' }),
    newThought({ value: 'Goodbye everyone, this is Max. Thanks for your help.' }),
    addAllMulticursor({}),
  ])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  expect(Object.keys(store.getState().multicursors)).toHaveLength(2)
})

// https://github.com/cybersemics/em/issues/4840
it('multicursor selection is preserved after applying Upper Case to one of two thoughts', async () => {
  await dispatch([
    newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' }),
    newThought({ value: 'Goodbye everyone, this is Max. Thanks for your help.' }),
    addMulticursorAtFirstMatch(['Hello everyone, this is Rose. Thanks for your help.']),
  ])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  expect(Object.keys(store.getState().multicursors)).toHaveLength(1)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - HELLO EVERYONE, THIS IS ROSE. THANKS FOR YOUR HELP.
  - Goodbye everyone, this is Max. Thanks for your help.`)
})

// https://github.com/cybersemics/em/issues/4840
it('multicursor selection is preserved after applying Upper Case to two of three thoughts', async () => {
  await dispatch([
    newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' }),
    newThought({ value: 'Goodbye everyone, this is Max. Thanks for your help.' }),
    newThought({ value: 'See you soon, this is Ann. Thanks for your help.' }),
    addMulticursorAtFirstMatch(['Hello everyone, this is Rose. Thanks for your help.']),
    addMulticursorAtFirstMatch(['See you soon, this is Ann. Thanks for your help.']),
  ])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await act(vi.runOnlyPendingTimersAsync)

  expect(Object.keys(store.getState().multicursors)).toHaveLength(2)

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- ${HOME_TOKEN}
  - HELLO EVERYONE, THIS IS ROSE. THANKS FOR YOUR HELP.
  - Goodbye everyone, this is Max. Thanks for your help.
  - SEE YOU SOON, THIS IS ANN. THANKS FOR YOUR HELP.`)
})

it('Recognizes a styled thought with uppercase text as UpperCase', async () => {
  await dispatch([newThought({ value: '<b>HELLO <font style="background-color: rgb(0, 128, 255);">WORLD</font></b>' })])
  await click('[data-testid="toolbar-icon"][aria-label="Letter Case"]')

  const upperCase = document.querySelector('[aria-label="UpperCase"][data-selected="true"]')
  expect(upperCase).toBeInTheDocument()
})
