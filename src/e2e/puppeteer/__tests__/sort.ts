import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import refresh from '../helpers/refresh'
import waitForEditable from '../helpers/waitForEditable'
import waitForThoughtExistInDb from '../helpers/waitForThoughtExistInDb'
import { usePersistentTreecrdtStorage } from '../setup'

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

/** Returns the visible order of the single-letter thoughts from the exported outline. Strips markdown formatting (e.g. **E**, ***D***) and meta thoughts (=sort, Alphabetical, Desc). */
const getLetterOrder = (exported: string): string[] =>
  exported
    .split('\n')
    .map(line => line.replace(/[-*\s]/g, ''))
    .filter(value => /^[a-zA-Z]$/.test(value))

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
  await clickToolbar('Sort Picker', 'Alphabetical')
  await clickToolbar('Sort Picker', 'Alphabetical')

  // Add Bold to E and C
  await clickThought('E')
  await clickToolbar('Bold')
  await clickThought('C')
  await clickToolbar('Bold')

  // Add Italic to D, then Bold to D (cursor remains on D after each format)
  await clickThought('D')
  await clickToolbar('Italic')
  await clickToolbar('Bold')

  await clickThought('B')

  // D and B both have two formats, so they outrank the singly-bold E and C; D's bold outranks B's italic within the pair
  const exported = await exportThoughts()
  expect(getLetterOrder(exported)).toEqual(['D', 'E', 'C', 'B', 'A'])
})

describe('persistent storage', () => {
  usePersistentTreecrdtStorage()

  // https://github.com/cybersemics/em/issues/5126
  it.skip('a thought typed into a sorted context keeps its sorted position after a refresh', async () => {
    await paste(`
      - c
      - a
      - d
    `)

    // set the cursor on a home child so that Sort targets the home context
    await clickThought('d')
    await command('toggleSort')

    // set the cursor to null so that New Subthought creates the thought in the home context
    await press('Escape')

    await command('newSubthought')
    await waitForEditable('')
    await keyboard.type('b')
    await waitForEditable('b')
    await waitForThoughtExistInDb('b')

    await refresh()

    // wait for every home child to hydrate before reading their order
    await waitForEditable('a')
    await waitForEditable('b')
    await waitForEditable('c')
    await waitForEditable('d')

    const exported = await exportThoughts()
    expect(getLetterOrder(exported)).toEqual(['a', 'b', 'c', 'd'])
  })
})
