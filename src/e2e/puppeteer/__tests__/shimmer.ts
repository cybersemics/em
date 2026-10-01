import acknowledgeAiDisclosure from '../helpers/acknowledgeAiDisclosure'
import clickThought from '../helpers/clickThought'
import clickToolbar from '../helpers/clickToolbar'
import command from '../helpers/command'
import deferDefinition from '../helpers/deferDefinition'
import getThoughtPixels from '../helpers/getThoughtPixels'
import paste from '../helpers/paste'
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
