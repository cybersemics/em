import { KnownDevices } from 'puppeteer'
import indentCommand from '../../../commands/indent'
import newThoughtCommand from '../../../commands/newThought'
import selectAllCommand from '../../../commands/selectAll'
import click from '../helpers/click'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import { startGesture } from '../helpers/gesture'
import paste from '../helpers/paste'
import { page } from '../session'

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('opens the pinned command over the Command Universe without closing it', async () => {
  await command('openMobileCommandUniverse')
  await click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await click('button[aria-label="Pin Command"]')
  await page.waitForSelector('[data-testid="pinned-command"]', { visible: true })

  // Visible means nothing covers it: the dialog's blurred backdrop spans the viewport, so whatever is on top at the
  // ring's center is what the user sees there.
  const topmostAtRing = await page.$eval('[data-testid="pinned-command"]', ring => {
    const { x, y, width, height } = ring.getBoundingClientRect()
    const topmost = document.elementFromPoint(x + width / 2, y + height / 2)
    return ring.contains(topmost) ? 'the pinned command' : (topmost?.className.toString() ?? 'nothing')
  })
  expect(topmostAtRing).toBe('the pinned command')

  await click('[data-testid="pinned-command"]')

  const tooltipSelector = '[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])'
  try {
    await page.waitForSelector(tooltipSelector, { visible: true, timeout: 5000 })
  } catch {
    const isCommandUniverseOpen = !!(await page.$('button[aria-label="Unpin Command"]'))
    throw new Error(
      `Expected the pinned command's tooltip to open over the Command Universe, but it did not. The Command Universe is ${isCommandUniverseOpen ? 'open' : 'closed'}.`,
    )
  }
  expect(await page.$eval(tooltipSelector, el => el.textContent)).toContain('Trace the gesture to practice.')
  expect(await page.$eval('button[aria-label="Unpin Command"]', el => !el.closest('[inert]'))).toBe(true)
})

it('traces the pinned gesture over the Command Universe as a dry run', async () => {
  await paste(`
    - a
  `)
  await command('openMobileCommandUniverse')
  await click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await click('button[aria-label="Pin Command"]')
  await click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    visible: true,
  })

  const trace = await startGesture({ target: '[data-testid="pinned-command-gesture"]' })
  await trace.move(newThoughtCommand)
  // The trace is drawn while the finger is down.
  try {
    await page.waitForFunction(
      () => getComputedStyle(document.querySelector('[data-testid="gesture-trace"]')!).opacity === '1',
      { timeout: 5000 },
    )
  } catch {
    const isTraceMounted = !!(await page.$('[data-testid="gesture-trace"]'))
    throw new Error(
      `Expected the gesture trace to be drawn over the Command Universe, but it is ${isTraceMounted ? 'hidden' : 'not mounted'}.`,
    )
  }
  await trace.end()

  expect(await exportThoughts()).toBe(`
- a
`)
  expect(await page.$eval('[data-testid="pinned-command"]', el => el.getAttribute('aria-description'))).toBe(
    'Practice progress: 0 of 5 repetitions',
  )
  expect(
    await page.$eval('[role="dialog"][aria-label="Gesture for New Thought"]', el => el.getAttribute('aria-hidden')),
  ).toBe('false')
  expect(await page.$('button[aria-label="Unpin Command"]')).not.toBeNull()
})

it('executes nothing for a chained gesture that ends in the pinned gesture over the Command Universe', async () => {
  await paste(`
    - a
    - b
  `)
  await command('openMobileCommandUniverse')
  await click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await click('button[aria-label="Pin Command"]')
  await click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    visible: true,
  })

  // Select All chained with New Thought.
  const trace = await startGesture({ target: '[data-testid="pinned-command-gesture"]' })
  await trace.move(selectAllCommand)
  await trace.move(newThoughtCommand)
  await trace.end()

  expect(await exportThoughts()).toBe(`
- a
- b
`)
  expect(await page.$$('[aria-label="bullet"][data-highlighted="true"]')).toHaveLength(0)
  expect(await page.$('button[aria-label="Unpin Command"]')).not.toBeNull()
})

it('rejects the gesture of another command over the Command Universe', async () => {
  await paste(`
    - a
    - b
  `)
  await clickThought('b')
  await command('openMobileCommandUniverse')
  await click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await click('button[aria-label="Pin Command"]')
  await click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    visible: true,
  })

  const trace = await startGesture({ target: '[data-testid="pinned-command-gesture"]' })
  await trace.move(indentCommand)
  await trace.end()

  expect(await exportThoughts()).toBe(`
- a
- b
`)
  expect(
    await page.$eval('[role="dialog"][aria-label="Gesture for New Thought"]', el => el.getAttribute('aria-hidden')),
  ).toBe('false')
  expect(await page.$('button[aria-label="Unpin Command"]')).not.toBeNull()
})
