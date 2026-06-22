import type { WindowEm } from '../../../initialize'
import getEditingText from '../helpers/getEditingText'
import { page } from '../session'

type StartupWindow = Window & {
  em?: {
    testFlags?: {
      preventInitialize?: boolean
    }
  }
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 20000 })

it('handles keyboard commands while thoughtspace initialization is delayed', async () => {
  await page.evaluateOnNewDocument(() => {
    const startupWindow = window as StartupWindow
    startupWindow.em = {
      ...(startupWindow.em ?? {}),
      testFlags: {
        ...startupWindow.em?.testFlags,
        preventInitialize: true,
      },
    }
  })

  await page.reload({ waitUntil: 'domcontentloaded' })

  await page.waitForFunction(() => typeof (window.em as WindowEm).testFlags.initialize === 'function')
  await page.waitForFunction(() => !document.querySelector('[aria-label=modal]'))
  await page.waitForSelector('[aria-label=empty-thoughtspace]')
  expect(await getEditingText()).toBeUndefined()

  try {
    await page.keyboard.press('Enter')

    await page.waitForSelector('[data-editing=true] [data-editable]')
    expect(await getEditingText()).toBe('')
  } finally {
    await page.evaluate(async () => {
      const em = window.em as WindowEm
      await em.testFlags.initialize?.()
      em.testFlags.preventInitialize = false
    })
  }
})
