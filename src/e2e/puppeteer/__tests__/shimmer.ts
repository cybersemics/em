import acknowledgeAiDisclosure from '../helpers/acknowledgeAiDisclosure'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import command from '../helpers/command'
import deferDefinition from '../helpers/deferDefinition'
import getSelection from '../helpers/getSelection'
import getThoughtPixels from '../helpers/getThoughtPixels'
import keyboard from '../helpers/keyboard'
import paste from '../helpers/paste'
import press from '../helpers/press'
import waitForEditable from '../helpers/waitForEditable'
import { page } from '../session'

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 })

// https://github.com/cybersemics/em/pull/5562#issuecomment-5771704130
it('paints shimmering text over its background color while defining a term', async () => {
  await paste('- Apple')
  await clickThought('Apple')
  await clickToolbar('Text Color', 'background color swatches', 'blue')
  await command('textColor')
  await acknowledgeAiDisclosure()
  const completeDefinition = await deferDefinition()

  await command('Define Term', { inputType: 'commandPalette' })
  await page.waitForSelector('[data-generating]')

  const pixels = await getThoughtPixels('Apple')
  expect(pixels.filter(([r, g, b]) => r < 20 && g < 80 && b < 80).length).toBeGreaterThan(50)
  expect(pixels.filter(([r, g, b]) => r < 20 && g > 80 && b > g).length).toBeGreaterThan(100)

  await completeDefinition()
  await waitForEditable('A sample definition.')
  await page.waitForFunction(() => !document.querySelector('[data-generating]'))
})

// https://github.com/cybersemics/em/pull/5562#issuecomment-5771704130
it('keeps red text red while defining a term', async () => {
  await paste('- Apple')
  await clickThought('Apple')
  await clickToolbar('Text Color', 'text color swatches', 'red')
  await command('textColor')
  await acknowledgeAiDisclosure()
  const completeDefinition = await deferDefinition()

  await command('Define Term', { inputType: 'commandPalette' })
  await page.waitForSelector('[data-generating]')

  const pixels = await getThoughtPixels('Apple')
  expect(pixels.filter(([r, g, b]) => r > 80 && r > g * 1.5 && r > b * 1.5).length).toBeGreaterThan(50)

  await completeDefinition()
  await waitForEditable('A sample definition.')
  await page.waitForFunction(() => !document.querySelector('[data-generating]'))
})

// https://github.com/cybersemics/em/pull/5562#issuecomment-5771720291
it('shimmers the note without moving its caret when defining a term', async () => {
  await paste('- Apple\n  - =note\n    - 🍎 A note')
  await clickThought('Apple')
  await acknowledgeAiDisclosure()
  const completeDefinition = await deferDefinition()

  await command('Define Term', { inputType: 'commandPalette' })
  await page.waitForSelector('[data-generating]')

  const animation = await page.$eval('[aria-label="note-editable"]', element => getComputedStyle(element).animationName)
  expect(animation).toBe('shimmerText')
  const maskPosition = await page.$eval('[aria-label="note-editable"]', element => {
    const style = getComputedStyle(element)
    return style.maskPosition
  })
  expect(await page.$eval('[aria-label="note-editable"]', element => getComputedStyle(element).maskImage)).toContain(
    'linear-gradient',
  )
  await page.waitForFunction(
    position => getComputedStyle(document.querySelector('[aria-label="note-editable"]')!).maskPosition !== position,
    {},
    maskPosition,
  )
  const fill = await page.$eval(
    '[aria-label="note-editable"]',
    element => getComputedStyle(element).webkitTextFillColor,
  )
  expect(fill).not.toBe('rgba(0, 0, 0, 0)')

  await click('[aria-label="note-editable"]')
  await press('Home')
  await press('ArrowRight')
  await press('ArrowRight')
  await keyboard.type('new ')
  expect(await page.$eval('[aria-label="note-editable"]', element => element.textContent)).toBe('🍎 new A note')
  const offset = await getSelection().focusOffset
  expect(offset).toBe(7)

  await completeDefinition()
  await waitForEditable('A sample definition.')
  await page.waitForFunction(() => !document.querySelector('[data-generating]'))
  expect(await page.$eval('[aria-label="note-editable"]', element => getComputedStyle(element).animationName)).toBe(
    'none',
  )
  expect(await getSelection().focusOffset).toBe(offset)
  expect(await page.$eval('[aria-label="note-editable"]', element => element.textContent)).toBe('🍎 new A note')
})
