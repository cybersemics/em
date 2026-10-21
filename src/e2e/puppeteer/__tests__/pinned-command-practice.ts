import { KnownDevices } from 'puppeteer'
import indentCommand from '../../../commands/indent'
import newThoughtCommand from '../../../commands/newThought'
import openMobileCommandUniverseCommand from '../../../commands/openMobileCommandUniverse'
import selectAllCommand from '../../../commands/selectAll'
import clickThought from '../helpers/clickThought'
import command from '../helpers/command'
import deviceEmulation from '../helpers/deviceEmulation'
import exportThoughts from '../helpers/exportThoughts'
import { startGesture } from '../helpers/gesture'
import paste from '../helpers/paste'
import { page } from '../session'

deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

vi.setConfig({ testTimeout: 60000, hookTimeout: 20000 })

it('keeps the tooltip open while tracing its diagram and closes after a successful rep', async () => {
  await command('openMobileCommandUniverse')
  await page.waitForSelector('button[aria-label="New Thought"]', { visible: true })
  await page.click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await page.click('button[aria-label="Pin Command"]')
  await page.click('button[aria-label="Close"]')
  await page.waitForSelector('[data-testid="pinned-command"]', { visible: true })
  await page.click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    visible: true,
  })

  await page.waitForSelector('[data-testid="pinned-command-gesture"]', { visible: true })
  const trace = await startGesture({ target: '[data-testid="pinned-command-gesture"]' })
  await trace.move('r')
  expect(
    await page.$eval('[role="dialog"][aria-label="Gesture for New Thought"]', el => el.getAttribute('aria-hidden')),
  ).toBe('false')
  await trace.move('d')
  await trace.end()

  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    hidden: true,
  })
  expect(await page.$eval('[data-testid="pinned-command"]', el => el.getAttribute('aria-description'))).toBe(
    'Practice progress: 1 of 5 repetitions',
  )
})

it('rejects the gesture of another command while the tooltip is open', async () => {
  await paste(`
    - a
    - b
  `)
  await command('openMobileCommandUniverse')
  await page.waitForSelector('button[aria-label="New Thought"]', { visible: true })
  await page.click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await page.click('button[aria-label="Pin Command"]')
  await page.click('button[aria-label="Close"]')
  await clickThought('b')
  await page.click('[data-testid="pinned-command"]')
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
})

it('rejects a chained gesture that ends in the pinned gesture', async () => {
  await paste(`
    - a
    - b
  `)
  await command('openMobileCommandUniverse')
  await page.waitForSelector('button[aria-label="New Thought"]', { visible: true })
  await page.click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await page.click('button[aria-label="Pin Command"]')
  await page.click('button[aria-label="Close"]')
  await clickThought('b')
  await page.click('[data-testid="pinned-command"]')
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
  expect(
    await page.$eval('[role="dialog"][aria-label="Gesture for New Thought"]', el => el.getAttribute('aria-hidden')),
  ).toBe('false')
})

it('rejects a gesture that matches no command while the tooltip is open', async () => {
  await paste(`
    - a
    - b
  `)
  await command('openMobileCommandUniverse')
  await page.waitForSelector('button[aria-label="New Thought"]', { visible: true })
  await page.click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await page.click('button[aria-label="Pin Command"]')
  await page.click('button[aria-label="Close"]')
  await clickThought('b')
  await page.click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    visible: true,
  })

  // No command has this gesture.
  const trace = await startGesture({ target: '[data-testid="pinned-command-gesture"]' })
  await trace.move('ldu')
  await trace.end()

  expect(await exportThoughts()).toBe(`
- a
- b
`)
  expect(
    await page.$eval('[role="dialog"][aria-label="Gesture for New Thought"]', el => el.getAttribute('aria-hidden')),
  ).toBe('false')
})

it('still opens the Command Universe from its gesture while the tooltip is open', async () => {
  await paste(`
    - a
    - b
  `)
  await command('openMobileCommandUniverse')
  await page.waitForSelector('button[aria-label="New Thought"]', { visible: true })
  await page.click('button[aria-label="New Thought"]')
  await page.waitForFunction(() => {
    const pin = document.querySelector('button[aria-label="Pin Command"]')
    return pin && !pin.closest('[inert]')
  })
  await page.click('button[aria-label="Pin Command"]')
  await page.click('button[aria-label="Close"]')
  await clickThought('b')
  await page.click('[data-testid="pinned-command"]')
  await page.waitForSelector('[role="dialog"][aria-label="Gesture for New Thought"]:not([aria-hidden="true"])', {
    visible: true,
  })

  const trace = await startGesture({ target: '[data-testid="pinned-command-gesture"]' })
  await trace.move(openMobileCommandUniverseCommand)
  await trace.end()

  await page.waitForSelector('input[placeholder="Search for a command"]', { visible: true })
})
