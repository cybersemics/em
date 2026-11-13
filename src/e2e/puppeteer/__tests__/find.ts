import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import exportThoughts from '../helpers/exportThoughts'
import getEditingText from '../helpers/getEditingText'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForFindStatus from '../helpers/waitForFindStatus'
import { page } from '../session'

// https://github.com/cybersemics/em/issues/5101
it('Escape moves the cursor to the current match, with the caret after it', async () => {
  await paste(`
    - fruit
      - apple
      - banana
    - vegetable
      - carrot
  `)
  await clickThought('fruit')

  await press('f', { meta: true })
  await keyboard.type('ban')
  await press('Enter')
  await press('Escape')
  await keyboard.type('X')

  expect(await getEditingText()).toBe('banXana')
})

it('Enter and Shift + Enter step through the matches and wrap around, leaving the cursor where it is', async () => {
  await paste(`
    - apple
    - banana
    - cherry
  `)
  await clickThought('cherry')

  await press('f', { meta: true })
  await keyboard.type('a')
  await waitForFindStatus('1 of 4')
  await press('Enter')
  await waitForFindStatus('2 of 4')
  await press('Enter', { shift: true })
  await waitForFindStatus('1 of 4')
  await press('Enter', { shift: true })
  await waitForFindStatus('4 of 4')

  expect(await getEditingText()).toBe('cherry')
})

it('the up and down buttons step through the matches and leave the focus in the query', async () => {
  await paste(`
    - apple
    - banana
    - cherry
  `)
  await clickThought('cherry')

  await press('f', { meta: true })
  await keyboard.type('a')
  await waitForFindStatus('1 of 4')
  await click('[role=search] [aria-label="Next match"]')
  await waitForFindStatus('2 of 4')
  await click('[role=search] [aria-label="Previous match"]')
  await click('[role=search] [aria-label="Previous match"]')
  await waitForFindStatus('4 of 4')
  await keyboard.type('n')
  await waitForFindStatus('1 of 2')

  expect(await getEditingText()).toBe('cherry')
})

it('the close button moves the cursor to the current match, as Escape does', async () => {
  await paste(`
    - fruit
      - apple
      - banana
    - vegetable
      - carrot
  `)
  await clickThought('fruit')

  await press('f', { meta: true })
  await keyboard.type('ban')
  await waitForFindStatus('1 of 1')
  await click('[role=search] [aria-label="Close"]')
  await keyboard.type('X')

  expect(await getEditingText()).toBe('banXana')
  expect(await page.$('[role=search]')).toBeNull()
})

it('a command keystroke with Enter moves the cursor to the current match before the command executes', async () => {
  await paste(`
    - fruit
      - apple
      - banana
  `)
  await clickThought('fruit')

  await press('f', { meta: true })
  await keyboard.type('ban')
  await waitForFindStatus('1 of 1')
  // New Subthought
  await press('Enter', { meta: true })

  expect(await exportThoughts()).toBe(`
- fruit
  - apple
  - banana
    - 
`)
  expect(await page.$('[role=search]')).toBeNull()
})

it('a text field shortcut edits the query rather than executing its command', async () => {
  await paste(`
    - apple
    - banana
  `)
  await clickThought('banana')

  await press('f', { meta: true })
  await keyboard.type('x')
  // Undo
  await press('z', { meta: true })

  expect(await page.$('[role=search]')).not.toBeNull()
  expect(await exportThoughts()).toBe(`
- apple
- banana
`)
})

it('clicking the find bar outside the query leaves the focus in the query', async () => {
  await paste(`
    - apple
    - banana
  `)
  await clickThought('banana')

  await press('f', { meta: true })
  await keyboard.type('xx')
  await waitForFindStatus('No matches')
  await click('[role=search] [aria-label="Next match"]')
  await click('[role=search] [role=status]')
  await press('Backspace')
  await press('Backspace')
  await keyboard.type('an')

  await waitForFindStatus('1 of 2')
})

it('a thought that autofocus hides does not match', async () => {
  await paste(`
    - a
      - b
        - c
          - d
            - e
  `)
  await clickThought('c')

  await press('f', { meta: true })
  await keyboard.type('a')

  await waitForFindStatus('No matches')
})

it('a command keystroke moves the cursor to the current match before the command executes', async () => {
  await paste(`
    - fruit
      - apple
      - banana
  `)
  await clickThought('fruit')

  await press('f', { meta: true })
  await keyboard.type('ban')
  await waitForFindStatus('1 of 1')
  // Indent
  await press('Tab')

  expect(await exportThoughts()).toBe(`
- fruit
  - apple
    - banana
`)
  expect(await page.$('[role=search]')).toBeNull()
})

it('Space and Backspace edit the query rather than executing their commands', async () => {
  await paste(`
    - apple
    - banana
  `)
  await clickThought('banana')

  await press('f', { meta: true })
  await keyboard.type('apple x')
  await press('Backspace')
  await press('Backspace')
  await waitForFindStatus('1 of 1')
  await press('Escape')

  expect(await getEditingText()).toBe('apple')
  expect(await exportThoughts()).toBe(`
- apple
- banana
`)
})

it('a space in the query does not indent an empty thought that has the cursor', async () => {
  await paste(`
    - apple
    - banana
  `)
  await clickThought('banana')
  await command('newThought')

  await press('f', { meta: true })
  await keyboard.type(' ')
  await press('Escape')

  expect(await exportThoughts()).toBe(`
- apple
- banana
- 
`)
})
