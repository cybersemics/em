import command from '../helpers/command'
import keyboard from '../helpers/keyboard'
import newThought from '../helpers/newThought'
import waitForSelector from '../helpers/waitForSelector'
import { page } from '../session'

vi.setConfig({ testTimeout: 20000, hookTimeout: 20000 })

describe('search', () => {
  // https://github.com/cybersemics/em/issues/4176
  it.skip('renders the search text with space after the magnifier icon', async () => {
    await newThought('a')
    await command('search')
    await waitForSelector('[contenteditable][placeholder="Search"]')
    await keyboard.type('magnifier')

    const gap = await page.evaluate(() => {
      const icon = document.querySelector('[role="img"][aria-label="Search"]')!
      const input = document.querySelector('[contenteditable][placeholder="Search"]')!
      const range = document.createRange()
      range.selectNodeContents(input)
      return range.getBoundingClientRect().left - icon.getBoundingClientRect().right
    })

    expect(gap).toBeGreaterThanOrEqual(4)
  })
})
