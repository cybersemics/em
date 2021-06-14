import { RefObject } from 'react'
import { Page } from 'puppeteer'
import clickBullet from './clickBullet'
import clickThought from './clickThought'
import clickWithOffset from './clickWithOffset'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import init from './initPage'
import newThought from './newThought'
import paste from './paste'
import press from './press'
import type from './type'
import waitForAlert from './waitForAlert'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'
import waitForEditable from './waitForEditable'
import waitForHiddenEditable from './waitForHiddenEditable'
import waitForState from './waitForState'
import waitForThoughtExistInDb from './waitForThoughtExistInDb'

const device = (page: RefObject<Page>) => {

  /** Partially apply the page in the ref as the first argument to the helper function. Gets the current page from the ref object at call time. */
  const withDriver = <U extends [], R>(f: (page: Page, ...rest: U) => R): (...args: U) => R =>
    (...args: U) => f(page.current!, ...args)

// TODO: Implement webdriver helpers or throw 'Not Implemented'

  return {

    clickBullet: withDriver(clickBullet),
    clickThought: withDriver(clickThought),
    clickWithOffset: withDriver(clickWithOffset),
    // editThought: withDriver(editThought),
    // gesture: withDriver(gesture),
    getEditable: withDriver(getEditable),
    getEditingText: withDriver(getEditingText),
    // getNativeElementRect: withDriver(getNativeElementRect),
    // hideKeyboardByTappingDone: withDriver(hideKeyboardByTappingDone),
    init,
    newThought: withDriver(newThought),
    paste: withDriver(paste),
    press: withDriver(press),
    type: withDriver(type),
    // tapReturnKey: withDriver(tapReturnKey),
    // tapWithOffset: withDriver(tapWithOffset),
    waitForAlert: withDriver(waitForAlert),
    waitForContextHasChildWithValue: withDriver(waitForContextHasChildWithValue),
    waitForEditable: withDriver(waitForEditable),
    // waitForElement: withDriver(waitForElement),
    // waitForElementNotExist: withDriver(waitForElementNotExist),
    waitForHiddenEditable: withDriver(waitForHiddenEditable),
    waitForState: withDriver(waitForState),
    waitForThoughtExistInDb: withDriver(waitForThoughtExistInDb),
  }

}

export default device
