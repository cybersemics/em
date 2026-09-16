/**
 * Hides the Android soft keyboard without blurring the editable, the way a user does with the keyboard's own
 * down-arrow button. Appium's hideKeyboard is performed by UiAutomator2 outside the page, so no blur fires — which
 * is exactly the path androidWebHandler exists for: it has to exit edit mode from the VirtualKeyboard
 * geometrychange event instead. The Android counterpart of the iOS hideKeyboardByTappingDone helper.
 *
 * Not browser.back(): in a Chrome session that is the WebDriver Back command, i.e. history navigation, which would
 * leave the app. The hardware back key (pressKeyCode 4) also closes the keyboard first, but hideKeyboard is the
 * portable Appium command.
 */
const hideKeyboard = (): Promise<void> => browser.hideKeyboard()

export default hideKeyboard
