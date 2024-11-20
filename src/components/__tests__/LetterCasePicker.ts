import { act } from 'react'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { HOME_TOKEN } from '../../constants'
import exportContext from '../../selectors/exportContext'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'

beforeEach(createTestApp)
afterEach(cleanupTestApp)

it('Set Lower Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="LetterCase"]')
  await click('[aria-label="letter case swatches"] [aria-label="LowerCase"]')
  
  await act(async () => vi.runOnlyPendingTimersAsync())

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - hello everyone, this is rose. thanks for your help.`)
})

it('Set Upper Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="LetterCase"]')
  await click('[aria-label="letter case swatches"] [aria-label="UpperCase"]')

  await act(async () => vi.runOnlyPendingTimersAsync())

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - HELLO EVERYONE, THIS IS ROSE. THANKS FOR YOUR HELP.`)
})

it('Set Sentence Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="LetterCase"]')
  await click('[aria-label="letter case swatches"] [aria-label="SentenceCase"]')

  await act(async () => vi.runOnlyPendingTimersAsync())

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - Hello everyone, this is rose. Thanks for your help.`)
})

it('Set Title Case to the current thought', async () => {
  await dispatch([newThought({ value: 'Hello everyone, this is Rose. Thanks for your help.' })])
  await click('[data-testid="toolbar-icon"][aria-label="LetterCase"]')
  await click('[aria-label="letter case swatches"] [aria-label="TitleCase"]')

  await act(async () => vi.runOnlyPendingTimersAsync())

  const state = store.getState()

  const exported = exportContext(state, [HOME_TOKEN], 'text/plain')
  expect(exported).toEqual(`- __ROOT__
  - Hello Everyone, This Is Rose. Thanks for Your Help.`)
})
