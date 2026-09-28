/**
 * Android Chrome smoke tests. They prove the app identifies the device and that the soft-keyboard lifecycle it
 * relies on (src/device/virtual-keyboard/handlers/androidWebHandler.ts) holds on a real device: Chrome's
 * VirtualKeyboard API reports the keyboard, the layout does not shrink under it, and hiding it exits edit mode even
 * though no blur fires. Behavior that is not Android-specific is covered by the Puppeteer and iOS suites.
 */
import $ from '../../iOS/helpers/$'
import clickThought from '../../iOS/helpers/clickThought'
import getEditingText from '../../iOS/helpers/getEditingText'
import isKeyboardShown from '../../iOS/helpers/isKeyboardShown'
import paste from '../../iOS/helpers/paste'
import waitForEditable from '../../iOS/helpers/waitForEditable'
import waitUntil from '../../iOS/helpers/waitUntil'
import hideKeyboard from '../helpers/hideKeyboard'

describe('Android', () => {
  it('identifies the platform as android', async () => {
    // Printed so that a CI log proves the assertions ran on a device rather than a desktop user agent.
    console.info(`userAgent: ${await browser.execute(() => navigator.userAgent)}`)

    // AppComponent mirrors isAndroid onto <body data-platform>. Nothing else in CI asserts it: every emulated device
    // in the Puppeteer suite is an iPhone, and the check was silently false on 64-bit Android for years
    // (see src/browser.ts).
    expect(await browser.execute(() => document.body.dataset.platform)).toBe('android')
  })

  it('opens the keyboard over the content on tap and exits edit mode when it hides', async () => {
    await paste('- a')
    await waitForEditable('a')
    const innerHeightBefore = await browser.execute(() => window.innerHeight)

    await clickThought('a') // set cursor
    await clickThought('a') // open keyboard
    await waitUntil(isKeyboardShown)
    expect((await $('[data-editing=true]')).elementId).toBeTruthy()

    // interactive-widget=overlays-content (index.html) plus androidWebHandler.init: the keyboard is reported through
    // the VirtualKeyboard API and the layout viewport does not shrink to make room for it.
    const geometry = await browser.execute(() => ({
      overlaysContent: navigator.virtualKeyboard.overlaysContent,
      keyboardHeight: navigator.virtualKeyboard.boundingRect.height,
      innerHeight: window.innerHeight,
    }))
    expect(geometry.overlaysContent).toBe(true)
    expect(geometry.keyboardHeight).toBeGreaterThan(0)
    // Chrome's own UI can move innerHeight by a few dozen pixels while the keyboard opens (the URL bar was
    // observed to cost 24 px on a Pixel 8), so what is asserted is that the layout did not give up the keyboard's
    // height — which it would under interactive-widget=resizes-content, the default.
    expect(innerHeightBefore - geometry.innerHeight).toBeLessThan(geometry.keyboardHeight)

    // Hiding the keyboard fires no blur; androidWebHandler must exit edit mode from the geometrychange event by
    // clearing the browser selection, which blurs the editable. The cursor stays on the thought (data-editing
    // remains), so the observable exit is the focus and the selection going away.
    await hideKeyboard()
    await waitUntil(async () => !(await isKeyboardShown()))
    await browser.waitUntil(
      async () =>
        browser.execute(() => !document.activeElement?.closest('[data-editable]') && !window.getSelection()?.focusNode),
      {
        timeoutMsg:
          'the editable is still focused or selected after the keyboard hid (androidWebHandler geometrychange)',
      },
    )
  })

  it('types into a thought', async () => {
    await paste('- a')
    await waitForEditable('a')
    await clickThought('a') // set cursor
    await clickThought('a') // open keyboard
    await waitUntil(isKeyboardShown)

    await browser.keys('b')

    await browser.waitUntil(async () => /b/.test((await getEditingText()) ?? ''), {
      timeoutMsg: 'the typed character did not reach the editing thought',
    })
  })
})
