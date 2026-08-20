import { page } from '../session'
import click from './click'
import scrollIntoView from './scrollIntoView'
import waitForSelector from './waitForSelector'

/**
 * Click a toolbar button by its label, and optionally a value in the dropdown that it opens, e.g. `clickToolbar('Outdent')` or `clickToolbar('Sort Picker', 'Alphabetical')`.
 *
 * A picker is rendered inside the toolbar button that opens it (see ToolbarButton), so values are matched by aria-label within the button. Nested values are given as a path, which is required when a value is ambiguous on its own, e.g. the Text Color dropdown contains both a text and a background swatch labeled "blue", so `clickToolbar('Text Color', 'background color swatches', 'blue')`.
 */
const clickToolbar = async (label: string, ...values: string[]) => {
  const toolbarSelector = `[data-testid="toolbar-icon"][aria-label="${label}"]`

  // The toolbar scrolls horizontally, so a button may be out of view. Center it rather than scrolling it just far enough, since the toolbar's edges are overlapped by opaque scroll arrows that would swallow the click.
  await waitForSelector(toolbarSelector)
  await scrollIntoView(toolbarSelector, { block: 'nearest', inline: 'center' })

  await click(toolbarSelector)

  if (values.length === 0) return

  const valueSelector = `${toolbarSelector} ${values.map(value => `[aria-label="${value}"]`).join(' ')}`
  await waitForSelector(valueSelector)

  // A value that matches more than one element would silently resolve to whichever comes first in the DOM, so require the caller to name the group that contains it.
  const groups = await page.$$eval(valueSelector, elements =>
    elements.map(element => element.parentElement?.closest('[aria-label]')?.getAttribute('aria-label')),
  )
  if (groups.length > 1) {
    const value = values[values.length - 1]
    throw new Error(
      `"${value}" matches ${groups.length} elements in the "${label}" dropdown. Name the group that contains it, e.g. clickToolbar('${label}', '${groups[0]}', '${value}').`,
    )
  }

  await click(valueSelector)
}

export default clickToolbar
