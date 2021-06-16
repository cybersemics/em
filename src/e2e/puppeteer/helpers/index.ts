import { Page } from 'puppeteer'
import testDriver from '../../../test-helpers/testDriver'
import { Index } from '../../../types'

// helpers
import $ from './$'
import click from './click'
import clickBullet from './clickBullet'
import clickThought from './clickThought'
import clickWithOffset from './clickWithOffset'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import newThought from './newThought'
import paste from './paste'
import press from './press'
import refresh from './refresh'
import selection from './selection'
import type from './type'
import waitForAlert from './waitForAlert'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'
import waitForEditable from './waitForEditable'
import waitForHiddenEditable from './waitForHiddenEditable'
import waitForState from './waitForState'
import waitForThoughtExistInDb from './waitForThoughtExistInDb'

// TODO: Implement webdriver helpers or throw 'Not Implemented'
// TODO: Why do the args need to be declared as any[]? testDriver type is off.
const helpers = {
  $,
  clickBullet,
  click,
  clickThought,
  clickWithOffset,
  // editThought,
  // gesture,
  getEditable,
  getEditingText,
  // getNativeElementRect,
  // hideKeyboardByTappingDone,
  newThought,
  paste,
  press,
  refresh,
  selection,
  type,
  // tapReturnKey,
  // tapWithOffset,
  waitForAlert,
  waitForContextHasChildWithValue,
  waitForEditable,
  // waitForElement,
  // waitForElementNotExist,
  waitForHiddenEditable,
  waitForState,
  waitForThoughtExistInDb,
}

const index = testDriver(helpers)

// Parameter<...> doesn't handle function overload afaik, so we need to fix the types manually before exporting
async function pasteOverload(text: string): Promise<void>
async function pasteOverload(pathUnranked: string[], text: string): Promise<void>
async function pasteOverload(pathUnranked: string | string[], text?: string): Promise<void> {}

const indexWithProperPaste = index as typeof index & {
  paste: typeof pasteOverload
}

export default indexWithProperPaste
