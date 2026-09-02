import { KnownDevices } from 'puppeteer'
import clickBullet from '../helpers/clickBullet'
import clickThought from '../helpers/clickThought'
import deviceEmulation from '../helpers/deviceEmulation'
import longPressThought from '../helpers/longPressThought'
import multiselectThoughts from '../helpers/multiselectThoughts'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Shift + Click the bullet of the given thought to select all thoughts between it and the previously selected thought. */
const shiftClickThought = async (value: string) => {
  await waitForEditable(value)

  await page.keyboard.down('Shift')
  try {
    await clickBullet(value)
  } finally {
    await page.keyboard.up('Shift')
  }
}

/** Waits for the given number of bullets to be highlighted by the multiselect. Reports the number that are
 * actually highlighted on timeout, since the alternative — puppeteer's own 30 s default, which outlives the
 * test timeout — fails the test without saying which step never arrived. */
const waitForHighlightedBullets = async (n: number) => {
  try {
    await page.waitForFunction(
      (n: number) => document.querySelectorAll('[aria-label="bullet"][data-highlighted="true"]').length === n,
      { timeout: 10000 },
      n,
    )
  } catch {
    const highlighted = await page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets => bullets.length)
    throw new Error(`Expected ${n} highlighted bullets, but ${highlighted} were highlighted.`)
  }
}

/** Waits a single animation frame, i.e. long enough for React to commit the render that follows a command. */
const nextFrame = () => page.evaluate(() => new Promise(requestAnimationFrame))

/** Reads the CSS cursor rendered over the text of every thought. */
const textCursors = () => page.$$eval('[data-editable]', editables => editables.map(el => getComputedStyle(el).cursor))

describe('multiselect', () => {
  // https://github.com/cybersemics/em/issues/4740
  it('starts multiselect at the Shift-clicked thought when there is no selection', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('a')
    await shiftClickThought('c')

    const highlightedValues = await page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
      bullets.map(
        bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
      ),
    )

    expect(highlightedValues).toEqual(['c'])
  })

  it('adjusts a Shift-click range from its original anchor', async () => {
    await paste(`
        - a
        - b
        - c
        - d
        - e
        - f
        `)

    await multiselectThoughts('a')
    await shiftClickThought('e')
    await shiftClickThought('c')

    const highlightedValues = await page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
      bullets.map(
        bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
      ),
    )

    expect(highlightedValues.sort()).toEqual(['a', 'b', 'c'])
  })

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        `)

    await multiselectThoughts(['a', 'b'])

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    const alertContent = await page.$eval('[data-testid=alert-content]', el => el.textContent)

    expect(highlightedBullets.length).toBe(2)
    expect(alertContent).toContain('2 thoughts selected')
  })

  // https://github.com/cybersemics/em/issues/3993
  // When Select All is active, the native copy handler must copy all selected thoughts, not just the focused cursor.
  // .skip keeps normal CI green while the test is red; remove the .skip when the fix lands.
  it('copies all selected thoughts when Select All is active', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    // place the cursor on b, then select all thoughts at the current level
    await clickThought('b')
    await press('a', { meta: true, alt: true })

    // The native copy event fires on the focused editable (permitDefault on copyCursor). Capture the
    // clipboard data it writes. With a multicursor active it must export all selected thoughts.
    const copiedText = await page.evaluate(() => {
      const editable = Array.from(document.querySelectorAll('[data-editable]')).find(
        el => el.textContent === 'b',
      ) as HTMLElement
      editable.focus()
      // collapse the caret inside b, mirroring the real desktop copy where the edited thought keeps focus
      const range = document.createRange()
      range.selectNodeContents(editable)
      range.collapse(true)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
      const clipboardData = new DataTransfer()
      editable.dispatchEvent(new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }))
      return clipboardData.getData('text/plain')
    })

    expect(copiedText).toContain('a')
    expect(copiedText).toContain('b')
    expect(copiedText).toContain('c')
  })

  // https://github.com/cybersemics/em/issues/3993 (Desktop Safari)
  // The copy command must write text/html and the text/em marker to the clipboard itself, rather than
  // relying on the native copy event of the focused editable. Safari (like headless Chrome) does not fire
  // a copy event for a collapsed contenteditable selection, so without an explicit text/html the browser
  // synthesizes its own html on paste, which shadows the plain text and breaks structured paste.
  it('writes html and the em marker to the clipboard when Select All is active', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    // intercept clipboardData.setData so we can observe what the copy command writes, regardless of
    // whether a native copy event fires (it does not for a collapsed selection in headless Chrome)
    await page.evaluate(() => {
      const win = window as typeof window & { __copied: Record<string, string> }
      win.__copied = {}
      const original = DataTransfer.prototype.setData
      DataTransfer.prototype.setData = function (type: string, data: string) {
        win.__copied[type] = data
        return original.call(this, type, data)
      }
    })

    // place the cursor on b, then select all thoughts at the current level and copy
    await clickThought('b')
    await press('a', { meta: true, alt: true })
    await press('c', { meta: true })

    const copied = await page.evaluate(() => (window as typeof window & { __copied: Record<string, string> }).__copied)

    // the em marker must be present so importData treats the html as em-structured content
    expect(copied['text/em']).toBeDefined()
    // the html must contain all selected thoughts so structured paste reconstructs the full selection
    expect(copied['text/html']).toContain('a')
    expect(copied['text/html']).toContain('b')
    expect(copied['text/html']).toContain('c')
  })

  // https://github.com/cybersemics/em/issues/5108
  it('does not enter edit mode when the multiselection is copied', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('b')
    await press('a', { meta: true, alt: true })
    await waitForHighlightedBullets(3)

    await press('c', { meta: true })

    // Copy leaves the thoughts selected but not edited, so no faux caret is rendered on them (Clear Thought is
    // what puts a multiselection into edit mode). Wait a frame first, since the faux carets would be rendered
    // on the frame after the copy completes.
    await nextFrame()
    await nextFrame()
    expect(await page.$$('[data-testid="faux-caret-multicursor"]')).toHaveLength(0)
    await waitForHighlightedBullets(3)
  })

  // https://github.com/cybersemics/em/issues/5108
  it('keeps multiselect edit mode active when Select All runs while multiselect is being edited', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    await clickThought('b')
    await press('a', { meta: true, alt: true })
    await waitForHighlightedBullets(3)

    // Enter multiselect edit mode via Clear Thought.
    await press('c', { alt: true, shift: true, meta: true })
    await page.waitForSelector('[data-testid="faux-caret-multicursor"]')

    await press('a', { meta: true, alt: true })

    // Select All should preserve edit mode in this branch, keeping the faux carets rendered.
    await page.waitForSelector('[data-testid="faux-caret-multicursor"]')
    await waitForHighlightedBullets(3)
  })

  // https://github.com/cybersemics/em/issues/4738
  it('does not expand a thought that the multiselect is extended onto', async () => {
    await paste(`
        - a
          - x
        - b
        - c
        `)

    await clickThought('c')

    await press('ArrowUp', { shift: true })
    await waitForHighlightedBullets(2)

    await press('ArrowUp', { shift: true })
    await waitForHighlightedBullets(3)

    const visibleThoughts = await page.$$eval('[data-editable]', elements => elements.map(el => el.innerHTML))

    // a is selected, so its subthought x must stay collapsed
    expect(visibleThoughts).toEqual(['a', 'b', 'c'])
  })

  // https://github.com/cybersemics/em/pull/4750
  it('points the bullet of a selected thought to the right, and expands it when the multiselect is cancelled', async () => {
    await paste(`
        - a
        - b
        - c
          - y
        `)

    await clickThought('a')

    await press('ArrowDown', { shift: true })
    await waitForHighlightedBullets(2)

    await press('ArrowDown', { shift: true })
    await waitForHighlightedBullets(3)

    /** Returns the rotation of the given thought's bullet. The triangle is rotated a quarter turn to point down when the thought is expanded, and is unrotated to point right when it is collapsed. */
    const bulletRotation = (value: string) =>
      page.evaluate((value: string) => {
        const editable = Array.from(document.querySelectorAll('[data-editable]')).find(
          element => element.textContent === value,
        )
        const bullet = editable!.closest('[aria-label="thought-container"]')!.querySelector('[data-bullet="parent"]')
        return getComputedStyle(bullet!).transform
      }, value)

    // c is selected, so it stays collapsed and its bullet must point right
    expect(await bulletRotation('c')).toBe('none')

    await press('Escape')
    await waitForHighlightedBullets(0)

    // the cursor is still on c, which expands once it is no longer selected
    await waitForEditable('y')
    expect(await bulletRotation('c')).not.toBe('none')
  })

  // https://github.com/cybersemics/em/issues/4728
  it('shows the multiselect highlight on table column 1 thoughts', async () => {
    await paste(`
        - a
          - =view
            - Table
          - b
            - c
          - d
            - e
        `)

    await waitForEditable('e')
    await multiselectThoughts(['c', 'e'])

    // Swap Note moves c and e into their parents' =note, so the multiselect moves up to b and d, which are
    // in table column 1.
    await press('KeyN', { alt: true, shift: true })

    // wait for both notes to render so the assertion runs after Swap Note has completed
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="note"]').length === 2, { timeout: 5000 })

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')
    expect(highlightedBullets.length).toBe(2)
  })

  // https://github.com/cybersemics/em/issues/4728
  it('restores the multiselect to the swapped thoughts when Swap Note is undone', async () => {
    await paste(`
        - a
          - =view
            - Table
          - b
            - c
          - d
            - e
        `)

    await waitForEditable('e')
    await multiselectThoughts(['c', 'e'])

    await press('KeyN', { alt: true, shift: true })

    // wait for both notes to render so the undo runs after Swap Note has completed
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="note"]').length === 2, { timeout: 5000 })

    await press('KeyZ', { meta: true })

    // wait for the notes to be converted back to thoughts
    await page.waitForFunction(() => document.querySelectorAll('[aria-label="note"]').length === 0, { timeout: 5000 })

    const highlightedValues = await page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
      bullets.map(
        bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
      ),
    )

    expect(highlightedValues.sort()).toEqual(['c', 'e'])
  })

  it('shows a pointer cursor on the thought text while a multiselect is active', async () => {
    await paste(`
        - a
        - b
        `)

    await waitForEditable('b')

    expect(await textCursors()).toEqual(['auto', 'auto'])

    await multiselectThoughts('b')
    await waitForHighlightedBullets(1)

    // a click on any thought now toggles its selection rather than moving the caret into its text
    expect(await textCursors()).toEqual(['pointer', 'pointer'])
  })

  it('shows the text cursor on the thought text while the multiselection is being edited', async () => {
    await paste(`
        - a
        - b
        `)

    await waitForEditable('b')

    await multiselectThoughts(['a', 'b'])
    await waitForHighlightedBullets(2)

    // Clear Thought, with its keyboard shortcut rather than the command helper, which executes the command directly
    // and would bypass the multicursor execution that clears both thoughts.
    await press('c', { alt: true, shift: true, meta: true })

    // the faux caret is rendered on b once the real caret has landed in a, i.e. once the multiselection is being edited
    await waitForSelector('[data-testid=faux-caret-multicursor]')

    // a click moves the caret as it does when a single thought is being edited
    expect(await textCursors()).toEqual(['auto', 'auto'])
  })
})

describe('mobile only', () => {
  deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

  it('should multiselect two thoughts at once', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    const a = await waitForEditable('a')
    const b = await waitForEditable('b')

    await longPressThought(a, { edge: 'right' })
    await longPressThought(b, { edge: 'right' })

    // In CI, sometimes the count of highlighted bullets are incorrect. The selector query runs immediately after both long presses, but react might not have finished re-rendering all bullet components.
    // Wait for the Command Center to show "2 thoughts selected" before we query for highlighted bullets.
    await page.waitForFunction(
      () => {
        const panel = document.querySelector('[data-testid=command-center-panel]')
        return panel?.textContent?.includes('2 thoughts selected') ?? false
      },
      { timeout: 6000 },
    )

    const highlightedBullets = await page.$$('[aria-label="bullet"][data-highlighted="true"]')

    expect(highlightedBullets.length).toBe(2)
  })

  // https://github.com/cybersemics/em/issues/3528
  it('single tap adds a thought to the multiselect, and a second tap removes it', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    const a = await waitForEditable('a')
    await longPressThought(a, { edge: 'right' })

    await clickThought('b')

    await expect
      .poll(() =>
        page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
          bullets.map(
            bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
          ),
        ),
      )
      .toEqual(['a', 'b'])

    await clickThought('b')

    await expect
      .poll(() =>
        page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
          bullets.map(
            bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
          ),
        ),
      )
      .toEqual(['a'])
  })

  // https://github.com/cybersemics/em/issues/3528
  it('single tap on a bullet adds a thought to the multiselect, and a second tap removes it', async () => {
    await paste(`
        - a
        - b
        - c
        `)

    const a = await waitForEditable('a')
    await waitForEditable('b')
    await longPressThought(a, { edge: 'right' })

    await clickBullet('b')

    await expect
      .poll(() =>
        page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
          bullets.map(
            bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
          ),
        ),
      )
      .toEqual(['a', 'b'])

    await clickBullet('b')

    await expect
      .poll(() =>
        page.$$eval('[aria-label="bullet"][data-highlighted="true"]', bullets =>
          bullets.map(
            bullet => bullet.closest('[aria-label="tree-node"]')?.querySelector('[data-editable]')?.textContent ?? null,
          ),
        ),
      )
      .toEqual(['a'])
  })
})
