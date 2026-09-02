import { fireEvent, render } from '@testing-library/react'
import { act, createElement } from 'react'
import { Provider } from 'react-redux'
import { desktopCommandUniverseActionCreator as desktopCommandUniverse } from '../../actions/desktopCommandUniverse'
import { newThoughtActionCreator as newThought } from '../../actions/newThought'
import { commandEmitter } from '../../commands'
import noteCommand from '../../commands/note'
import store from '../../stores/app'
import click from '../../test-helpers/click'
import createTestApp, { cleanupTestApp } from '../../test-helpers/createTestApp'
import dispatch from '../../test-helpers/dispatch'
import PanelCommand from '../CommandCenter/PanelCommand'

beforeEach(createTestApp)
afterEach(async () => {
  vi.restoreAllMocks()
  await cleanupTestApp()
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a toolbar command', async () => {
  await dispatch([newThought({ value: 'a' })])
  const commandEmitterTriggerSpy = vi.spyOn(commandEmitter, 'trigger')

  await click('[data-testid="toolbar-icon"][aria-label="Note"]')

  expect(
    commandEmitterTriggerSpy.mock.calls.some(call => call[0] === 'command' && call[1]?.id === noteCommand.id),
  ).toBe(true)
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a desktop command universe command', async () => {
  await dispatch([newThought({ value: 'a' })])
  const commandEmitterTriggerSpy = vi.spyOn(commandEmitter, 'trigger')

  await act(async () => {
    store.dispatch(desktopCommandUniverse())
  })
  await act(vi.runOnlyPendingTimersAsync)

  fireEvent.keyDown(window, { key: 'Enter' })
  await act(vi.runOnlyPendingTimersAsync)

  expect(commandEmitterTriggerSpy.mock.calls.some(call => call[0] === 'command' && call[1] !== undefined)).toBe(true)
})

// https://github.com/cybersemics/em/issues/4774
it('flushes pending edits before executing a command center command', async () => {
  await dispatch([newThought({ value: 'a' })])
  const commandEmitterTriggerSpy = vi.spyOn(commandEmitter, 'trigger')

  const { container } = render(
    createElement(Provider, {
      store,
      children: createElement(PanelCommand, {
        command: noteCommand,
        size: 'small',
      }),
    }),
  )

  const noteButton = container.querySelector(`[aria-label="${noteCommand.label}"]`) as HTMLElement
  fireEvent.click(noteButton)

  expect(
    commandEmitterTriggerSpy.mock.calls.some(call => call[0] === 'command' && call[1]?.id === noteCommand.id),
  ).toBe(true)
})
