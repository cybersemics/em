import _ from 'lodash'
import { RefObject } from 'react'
import { Browser } from 'webdriverio'
import clickThought from './clickThought'
import editThought from './editThought'
import gesture from './gesture'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import getNativeElementRect from './getNativeElementRect'
import hideKeyboardByTappingDone from './hideKeyboardByTappingDone'
import init from './initSession'
import paste from './paste'
import tapReturnKey from './tapReturnKey'
import tapWithOffset from './tapWithOffset'
import waitForEditable from './waitForEditable'
import waitForElement from './waitForElement'
import waitForElementNotExist from './waitForElementNotExist'


const device = (browser: RefObject<Browser<'async'>>) => {

  /** Partially apply the device driver in the ref as the first argument to the helper function. Gets the current driver from the ref object at call time. */
  const withDriver = <U extends [], R>(f: (driver: Browser<'async'>, ...rest: U) => R): (...args: U) => R =>
    (...args: U) => f(browser.current!, ...args)

  return {
    clickThought: withDriver(clickThought),
    editThought: withDriver(editThought),
    gesture: withDriver(gesture),
    getEditable: withDriver(getEditable),
    getEditingText: withDriver(getEditingText),
    getNativeElementRect: withDriver(getNativeElementRect),
    hideKeyboardByTappingDone: withDriver(hideKeyboardByTappingDone),
    init,
    paste: withDriver(paste),
    tapReturnKey: withDriver(tapReturnKey),
    tapWithOffset: withDriver(tapWithOffset),
    waitForEditable: withDriver(waitForEditable),
    waitForElement: withDriver(waitForElement),
    waitForElementNotExist: withDriver(waitForElementNotExist),
  }

}

export default device
