import { expect, it } from 'vitest'
import Command from '../../@types/Command'
import { registeredCommands } from '../../commands'
import { noop } from '../../constants'
import systemMenuDefinition from '../../util/systemMenuDefinition'

/** The required properties that a fixture command does not use. */
const inert = { multicursor: false, exec: noop } as const

it('groups the commands that name a system menu by menu, sorted by label', () => {
  const commands: Command[] = [
    { ...inert, id: 'toggleTableView', label: 'Table View', systemMenu: 'View' },
    { ...inert, id: 'settings', label: 'Settings', systemMenu: 'App' },
    { ...inert, id: 'pin', label: 'Pin', systemMenu: 'View' },
    { ...inert, id: 'home', label: 'Home' },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    View: [
      { id: 'pin', label: 'Pin', checkable: false },
      { id: 'toggleTableView', label: 'Table View', checkable: false },
    ],
    App: [{ id: 'settings', label: 'Settings', checkable: false }],
  })
})

it('writes the modifiers of a shortcut in the accelerator as Cmd, Alt, Ctrl, and Shift', () => {
  const commands: Command[] = [
    {
      ...inert,
      id: 'pinDescendants',
      label: 'Pin Descendants',
      systemMenu: 'View',
      keyboard: { key: 'p', meta: true, alt: true, shift: true },
    },
    {
      ...inert,
      id: 'extractSubthought',
      label: 'Extract Subthought',
      systemMenu: 'Edit',
      keyboard: { key: 'e', control: true, meta: true },
    },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    View: [{ id: 'pinDescendants', label: 'Pin Descendants', accelerator: 'Cmd+Alt+Shift+P', checkable: false }],
    Edit: [{ id: 'extractSubthought', label: 'Extract Subthought', accelerator: 'Cmd+Ctrl+E', checkable: false }],
  })
})

it('writes punctuation as the character and other keys by name', () => {
  const commands: Command[] = [
    { ...inert, id: 'settings', label: 'Settings', systemMenu: 'App', keyboard: { key: ',', meta: true } },
    {
      ...inert,
      id: 'cursorPrev',
      label: 'Previous Thought',
      systemMenu: 'Cursor',
      keyboard: { key: 'ArrowUp', meta: true },
    },
    {
      ...inert,
      id: 'newUncle',
      label: 'New Subthought (next)',
      systemMenu: 'Edit',
      keyboard: { key: 'Enter', meta: true, alt: true },
    },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    App: [{ id: 'settings', label: 'Settings', accelerator: 'Cmd+,', checkable: false }],
    Cursor: [{ id: 'cursorPrev', label: 'Previous Thought', accelerator: 'Cmd+ArrowUp', checkable: false }],
    Edit: [{ id: 'newUncle', label: 'New Subthought (next)', accelerator: 'Cmd+Alt+Enter', checkable: false }],
  })
})

it('gives a bare or Shift-only shortcut no accelerator', () => {
  const commands: Command[] = [
    { ...inert, id: 'cursorBack', label: 'Back', systemMenu: 'Cursor', keyboard: 'Escape' },
    { ...inert, id: 'outdent', label: 'Outdent', systemMenu: 'Edit', keyboard: { key: 'Tab', shift: true } },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    Cursor: [{ id: 'cursorBack', label: 'Back', checkable: false }],
    Edit: [{ id: 'outdent', label: 'Outdent', checkable: false }],
  })
})

it('gives a shortcut that a native item already has no accelerator', () => {
  const commands: Command[] = [
    { ...inert, id: 'home', label: 'Home', systemMenu: 'Cursor', keyboard: { key: 'h', meta: true, alt: true } },
    { ...inert, id: 'pin', label: 'Pin', systemMenu: 'View', keyboard: { key: 'p', meta: true, alt: true } },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    Cursor: [{ id: 'home', label: 'Home', checkable: false }],
    View: [{ id: 'pin', label: 'Pin', accelerator: 'Cmd+Alt+P', checkable: false }],
  })
})

it('uses the shortcut that the app displays: the first of an array, or keyboardDisplay', () => {
  const commands: Command[] = [
    {
      ...inert,
      id: 'selectAll',
      label: 'Select All',
      systemMenu: 'Cursor',
      keyboard: [
        { key: 'a', meta: true, alt: true },
        { key: 'a', meta: true },
      ],
    },
    {
      ...inert,
      id: 'jumpBack',
      label: 'Jump Back',
      systemMenu: 'Cursor',
      keyboard: { key: 'j', meta: true },
      keyboardDisplay: { key: 'j', meta: true, shift: true },
    },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    Cursor: [
      { id: 'jumpBack', label: 'Jump Back', accelerator: 'Cmd+Shift+J', checkable: false },
      { id: 'selectAll', label: 'Select All', accelerator: 'Cmd+Alt+A', checkable: false },
    ],
  })
})

it('makes a command checkable when isActive is its only toggle state', () => {
  const commands: Command[] = [
    { ...inert, id: 'toggleTableView', label: 'Table View', systemMenu: 'View', isActive: () => true },
    { ...inert, id: 'pin', label: 'Pin', labelInverse: 'Unpin', systemMenu: 'View', isActive: () => true },
    {
      ...inert,
      id: 'textColor',
      label: 'Text Color',
      systemMenu: 'View',
      isActive: () => true,
      isDropdownOpen: () => false,
    },
  ]

  expect(systemMenuDefinition(commands)).toEqual({
    View: [
      { id: 'pin', label: 'Pin', checkable: false },
      { id: 'toggleTableView', label: 'Table View', checkable: true },
      { id: 'textColor', label: 'Text Color', checkable: false },
    ],
  })
})

it('throws for a shortcut whose key has no accelerator', () => {
  const commands: Command[] = [
    { ...inert, id: 'help', label: 'Help', systemMenu: 'Help', keyboard: { key: '?', meta: true } },
  ]

  expect(() => systemMenuDefinition(commands)).toThrow(
    'The keyboard shortcut of help uses the key "?", which has no menu accelerator.',
  )
})

// desktop/src/menu.rs builds the system menu from desktop/menu.json at compile time, so the file must describe the commands as they are. Regenerate it with `yarn tauri:menu`, which runs this test with --update.
it('desktop/menu.json is the system menu definition of the registered commands', async () => {
  await expect(
    `${JSON.stringify(systemMenuDefinition(registeredCommands), null, 2)}\n`,
    // Vitest appends its own message after a colon.
    'desktop/menu.json is out of date. Run yarn tauri:menu',
  ).toMatchFileSnapshot('../../../desktop/menu.json')
})
