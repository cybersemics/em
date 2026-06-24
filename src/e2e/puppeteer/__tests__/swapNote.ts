import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import paste from '../helpers/paste'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('swapNote', () => {
  // Regression test for https://github.com/cybersemics/em/issues/4279
  it('next thought does not overlap the note created by Swap Note', async () => {
    await paste(`
      - Lorem
        - Ut enim
      - Excepteur
    `)

    // Expand the parent so the subthought renders, then place the cursor on the subthought and Swap Note
    // it into a note on its parent.
    await clickThought('Lorem')
    await clickThought('Ut enim')
    await command('swapNote')

    // Wait for the note to render.
    await waitForSelector('[aria-label="note"]')

    // Wait for the layout to settle (the note mount triggers a height recompute), by polling until the
    // next thought's tree-node top is stable across two consecutive animation frames.
    await page.waitForFunction(() => {
      const note = document.querySelector('[aria-label="note"]')
      const excepteur = Array.from(document.querySelectorAll('[data-editable]')).find(el =>
        el.textContent?.includes('Excepteur'),
      )
      const treeNode = excepteur?.closest('[aria-label="tree-node"]')
      if (!note || !treeNode) return false
      const top = treeNode.getBoundingClientRect().top
      const w = window as typeof window & { __swapNoteLastTop?: number }
      if (w.__swapNoteLastTop === top) return true
      w.__swapNoteLastTop = top
      return false
    })

    const { noteBottom, nextTop } = await page.evaluate(() => {
      const note = document.querySelector('[aria-label="note"]')!
      const excepteur = Array.from(document.querySelectorAll('[data-editable]')).find(el =>
        el.textContent?.includes('Excepteur'),
      )!
      const treeNode = excepteur.closest('[aria-label="tree-node"]')!
      return {
        noteBottom: note.getBoundingClientRect().bottom,
        nextTop: treeNode.getBoundingClientRect().top,
      }
    })

    // The next thought's container must start at or below the note's bottom, otherwise they overlap.
    expect(nextTop).toBeGreaterThanOrEqual(noteBottom - 0.5)
  })
})
