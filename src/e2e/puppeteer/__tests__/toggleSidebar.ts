import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import getSelection from '../helpers/getSelection'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('toggle sidebar', () => {
  it('when clicking the menu button twice to open & close the sidebar, the caret offset should be preserved once it closes.', async () => {
    const importText = `
    - Hello`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 1 })

    await click('[aria-label=menu]')
    await click('[aria-label=menu]')

    // the focus must be after 'H' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('Hello')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(1)
  })

  it('when clicking the menu button then pressing Escape to open & close the sidebar, the caret offset should be preserved once it closes.', async () => {
    const importText = `
    - Hello`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 2 })

    await click('[aria-label=menu]')
    // Wait for the sidebar to be open (mounted and not inert). The sidebar subtree only mounts
    // while open, so checking for the absence of [inert] alone would pass before it even mounts.
    await waitUntil(() => {
      const sidebar = document.querySelector('[data-testid="sidebar"]')
      return !!sidebar && !sidebar.hasAttribute('inert')
    })
    await press('Escape')
    // The sidebar subtree unmounts entirely once the close animation completes,
    // so wait for it to be removed from the DOM.
    await waitUntil(() => !document.querySelector('[data-testid="sidebar"]'))

    // the focus must be after 'e' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('Hello')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(2)
  })

  it('when clicking the menu button then clicking in empty space to open & close the sidebar, the caret offset should be preserved once it closes.', async () => {
    const importText = `
    - Hello`

    await paste(importText)

    const editableNodeHandle = await waitForEditable('Hello')
    await click(editableNodeHandle, { offset: 3 })

    await click('[aria-label=menu]')
    await click('[data-testid=sidebar] [aria-hidden=true]')

    // the focus must be after 'l' after cursor down
    const textContext = await getSelection().focusNode?.textContent
    expect(textContext).toBe('Hello')

    const offset = await getSelection().focusOffset
    expect(offset).toBe(3)
  })

  // https://github.com/cybersemics/em/issues/6227
  it('opening and closing the sidebar dismisses Select All and returns the caret to the cursor', async () => {
    await paste(`
    - a
    - b
    - c
    - d`)

    await clickThought('d')
    await command('selectAll')
    await waitUntil(() => document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]').length === 4)

    await click('[aria-label=menu]')
    await click('[aria-label=menu]')
    await waitUntil(() => !document.querySelector('[data-testid="sidebar"]'))

    expect(await page.$$('[aria-label="bullet"][data-highlighted="true"]')).toHaveLength(0)
    expect(await getSelection().focusNode?.textContent).toBe('d')
    expect(await page.$$('[data-testid="faux-caret-multicursor"]')).toHaveLength(0)
  })
})
