import type { WindowEm } from '../../../initialize'
import { page } from '../setup'

type WindowEmWithStartupFlags = WindowEm & {
  testFlags: WindowEm['testFlags'] & {
    thoughtspaceInitBlocker?: Promise<void> | null
  }
}

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

  await page.waitForFunction(() => Boolean((window.em as WindowEmWithStartupFlags).testFlags.thoughtspaceInitBlocker))
  await page.waitForFunction(() => !document.querySelector('[aria-label=modal]'))
  await page.waitForSelector('[aria-label=empty-thoughtspace]')

  try {
    await page.keyboard.press('Enter')

    await page.waitForFunction(() => {
      const em = window.em as WindowEm
      return em.testHelpers.getState().lastUndoableActionType === 'newThought'
    })

    const result = await page.evaluate(() => {
      const em = window.em as WindowEm
      const editable = document.querySelector('[data-editing=true] [data-editable]')

      return {
        editingText: editable?.innerHTML,
        lastUndoableActionType: em.testHelpers.getState().lastUndoableActionType,
      }
    })

    expect(result).toEqual({
      editingText: '',
      lastUndoableActionType: 'newThought',
    })
  } finally {
    await page.evaluate(() => {
      const startupWindow = window as StartupWindow
      startupWindow.__releaseThoughtspaceInit?.()
    })
  }
})
