import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
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
it('a thought formatted with multiple styles is sorted by its highest-priority format (bold) in reverse alphabetical order', async () => {
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
  await command('toggleSort')
  await command('toggleSort')

  // Add Bold to E and C
  await clickThought('E')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')
  await clickThought('C')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

  // Add Italic to D, then Bold to D (cursor remains on D after each format)
  await clickThought('D')
  await click('[data-testid="toolbar-icon"][aria-label="Italic"]')
  await click('[data-testid="toolbar-icon"][aria-label="Bold"]')

  // Bold D should be sorted among the bold thoughts by its text, landing between E and C
  const exported = await exportThoughts()
  expect(getLetterOrder(exported)).toEqual(['E', 'D', 'C', 'B', 'A'])
})
