import { describe } from 'vitest'
import sleep from '../../../util/sleep'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import getEditingText from '../helpers/getEditingText'
import paste from '../helpers/paste'
import scroll from '../helpers/scroll'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../setup'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

/** Checks if an element is in the viewport. */
const isInViewport = async (selector: string): Promise<boolean> => {
  return page.evaluate((selector: string) => {
    const element = document.querySelector(selector)
    if (!element) return false
    const rect = element.getBoundingClientRect()
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    )
  }, selector)
}

describe('scroll cursor into view on sort', { retry: 3 }, () => {
  it('should scroll cursor into view when sorting moves cursor thought off-screen', async () => {
    // Create a long list that will cause scrolling when sorted
    const importText = `
- z
- a
- b
- c
- d
- e
- f
- g
- h
- i
- j
- k
- l
- m
- n
- o
- p
- q
- r
- s
- t
- u
- v
- w
- x
- y`

    await paste(importText)

    // Wait for the list to be rendered
    await waitForEditable('z')

    // Click on 'z' to set cursor - it should be at the top
    await clickThought('z')
    await waitForEditable('z')

    // Scroll to make sure 'z' is at the top and the bottom thoughts are off-screen
    await scroll(0, 0)
    await sleep(100)

    // Verify cursor is on 'z'
    let thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('z')

    // Check that the thought with value 'z' is visible before sorting
    const beforeSortVisible = await isInViewport('[data-editable-id][data-editing="true"]')
    expect(beforeSortVisible).toBe(true)

    // Sort alphabetically - this should move 'z' to the bottom of the list
    await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
    await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

    // Wait for sort to complete
    await sleep(200)

    // Verify cursor is still on 'z'
    thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('z')

    // Verify that 'z' (now at the bottom) is scrolled into view
    const afterSortVisible = await isInViewport('[data-editable-id][data-editing="true"]')
    expect(afterSortVisible).toBe(true)
  })

  it('should scroll cursor into view when using setSortPreference', async () => {
    // Create a shorter list for quicker testing
    const importText = `
- zebra
- apple
- banana
- cherry
- date
- elderberry
- fig
- grape`

    await paste(importText)

    // Wait for the list to be rendered
    await waitForEditable('zebra')

    // Click on 'zebra' to set cursor
    await clickThought('zebra')
    await waitForEditable('zebra')

    // Verify cursor is on 'zebra'
    let thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('zebra')

    // Sort alphabetically using the sort picker
    await click('[data-testid="toolbar-icon"][aria-label="SortPicker"]')
    await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

    // Wait for sort to complete
    await sleep(200)

    // Verify cursor is still on 'zebra' and it's visible
    thoughtValue = await getEditingText()
    expect(thoughtValue).toBe('zebra')

    const afterSortVisible = await isInViewport('[data-editable-id][data-editing="true"]')
    expect(afterSortVisible).toBe(true)
  })
})
