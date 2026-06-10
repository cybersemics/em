import getEditingText from '../helpers/getEditingText'
import { page } from '../setup'

type StartupWindow = Window & {
  __EM_TEST_FLAGS__?: {
    thoughtspaceInitBlocker?: Promise<void>
  }
  __releaseThoughtspaceInit?: () => void
}

vi.setConfig({ testTimeout: 30000, hookTimeout: 20000 })

it('handles keyboard commands while thoughtspace initialization is delayed', async () => {
  await page.evaluateOnNewDocument(() => {
    const windowWithTestFlags = window as StartupWindow
    windowWithTestFlags.__EM_TEST_FLAGS__ = {
      thoughtspaceInitBlocker: new Promise<void>(resolve => {
        windowWithTestFlags.__releaseThoughtspaceInit = resolve
      }),
    }
  })

  await page.reload({ waitUntil: 'domcontentloaded' })

  await page.waitForFunction(() => !document.querySelector('[aria-label=modal]'))
  await page.waitForSelector('[aria-label=empty-thoughtspace]')
  expect(await getEditingText()).toBeUndefined()

  try {
    await page.keyboard.press('Enter')

    await page.waitForSelector('[data-editing=true] [data-editable]')
    expect(await getEditingText()).toBe('')
  } finally {
    await page.evaluate(() => {
      const startupWindow = window as StartupWindow
      startupWindow.__releaseThoughtspaceInit?.()
    })
  }
})
