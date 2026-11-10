import clickNote from '../helpers/clickNote'
import clickThought from '../helpers/clickThought'
import exportThoughts from '../helpers/exportThoughts'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitUntil from '../helpers/waitUntil'
import { page } from '../session'

// https://github.com/cybersemics/em/issues/5084
it('keeps typed spaces out of the saved note and trims them from view on blur without stealing focus', async () => {
  await paste(`
    - a
      - =note
        - seed
  `)
  await clickThought('a')
  await clickNote('seed')
  await press('Home')
  await keyboard.type('  ')
  await press('End')
  await keyboard.type('  ')

  // The note shows the spaces while it is being edited, but they are never saved.
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('  seed  ')
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - seed
`)

  await clickThought('a')
  await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('seed')
})

// https://github.com/cybersemics/em/issues/5084
it('saves formatted references without the spaces typed around them', async () => {
  await paste(`
    - a
      - =note
        - =path
          - b
      - b
        - **c**
        - **d**
  `)
  await clickThought('a')
  await clickNote('<b>c</b>, <b>d</b>')
  await press('Home')
  await keyboard.type('  ')
  await press('End')
  await keyboard.type('  ')

  // The spaces typed inside the formatting are never saved to the referenced thoughts.
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - =path
      - b
  - b
    - **c**
    - **d**
`)

  await clickThought('a')
  await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('<b>c</b>, <b>d</b>')
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - =path
      - b
  - b
    - **c**
    - **d**
`)

  await clickNote('<b>c</b>, <b>d</b>')
  await press('End')
  await keyboard.type('e  ')
  await clickThought('a')
  await waitUntil(() => window.getSelection()?.focusNode?.textContent === 'a')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.innerHTML)).toBe('<b>c</b>, <b>de</b>')
  expect(await exportThoughts()).toBe(`
- a
  - =note
    - =path
      - b
  - b
    - **c**
    - **de**
`)
})
