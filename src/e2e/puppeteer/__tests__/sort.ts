import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import paste from '../helpers/paste'

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

/** Returns the visible order of the single-letter thoughts A–E from the exported outline. Strips markdown formatting (e.g. **E**, ***D***) and meta thoughts (=sort, Alphabetical, Desc). */
const getLetterOrder = (exported: string): string[] =>
  exported
    .split('\n')
    .map(line => line.replace(/[-*\s]/g, ''))
    .filter(value => ['A', 'B', 'C', 'D', 'E'].includes(value))

// https://github.com/cybersemics/em/issues/3977
it('a thought formatted with multiple styles is given greater priority than thoughts with a single format', async () => {
  await paste(`
    - A
    - B
    - C
    - D
    - E
  `)

  // set the cursor on a home child so that Sort targets the home context
  await clickThought('A')

  // Sort - Alphabetically - Descending (None → Alphabetical/Asc → Alphabetical/Desc)
  await click('[data-testid="toolbar-icon"][aria-label="Sort Picker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')
  await click('[data-testid="toolbar-icon"][aria-label="Sort Picker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

  // Add Bold to E and C
  await clickThought('E')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await clickThought('C')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

  // Add Italic to D, then Bold to D (cursor remains on D after each format)
  await clickThought('D')
  await click('[data-testid="toolbar-icon"][aria-label="Italic"]')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

  await clickThought('B')

  // D and B both have two formats, so they outrank the singly-bold E and C; D's bold outranks B's italic within the pair
  const exported = await exportThoughts()
  expect(getLetterOrder(exported)).toEqual(['D', 'E', 'C', 'B', 'A'])
})

// https://github.com/cybersemics/em/issues/3977
it('a thought with more formatting types outranks one with fewer, even if the latter has a higher-priority format', async () => {
  await paste(`
    - A
    - B
    - C
  `)

  // set the cursor on a home child so that Sort targets the home context
  await clickThought('A')

  // Sort - Alphabetically - Descending (None → Alphabetical/Asc → Alphabetical/Desc)
  await click('[data-testid="toolbar-icon"][aria-label="Sort Picker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')
  await click('[data-testid="toolbar-icon"][aria-label="Sort Picker"]')
  await click('[aria-label="sort options"] [aria-label="Alphabetical"]')

  // Add Bold + Italic to A (two formats, highest priority is bold)
  await clickThought('A')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await click('[data-testid="toolbar-icon"][aria-label="Italic"]')

  // Add Italic + Underline + Strikethrough to A (three formats, no bold)
  await clickThought('B')
  await click('[data-testid="toolbar-icon"][aria-label="Italic"]')
  await click('[data-testid="toolbar-icon"][aria-label="Underline"]')
  await click('[data-testid="toolbar-icon"][aria-label="Strikethrough"]')

  // A's three formats outrank B's two, even though B has bold (the highest-priority format)
  const exported = await exportThoughts()
  expect(getLetterOrder(exported)).toEqual(['B', 'A', 'C'])
})
