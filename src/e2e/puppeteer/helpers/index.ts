import { Page } from 'puppeteer'
import partialWithRef from '../../../test-helpers/partialWithRef'
// helpers
import $ from './$'
import click from './click'
import clickBullet from './clickBullet'
import clickThought from './clickThought'
import down from './down'
import getComputedColor from './getComputedColor'
import getEditable from './getEditable'
import getEditingText from './getEditingText'
import getSelection from './getSelection'
import newThought from './newThought'
import paste from './paste'
import press from './press'
import refresh from './refresh'
import remove from './remove'
import screenshot from './screenshot'
import scroll from './scroll'
import setup from './setup'
import type from './type'
import waitForContextHasChildWithValue from './waitForContextHasChildWithValue'
import waitForEditable from './waitForEditable'
import waitForHiddenEditable from './waitForHiddenEditable'
import waitForState from './waitForState'
import waitForThoughtExistInDb from './waitForThoughtExistInDb'
import waitUntil from './waitUntil'

async function pasteOverload(text: string): Promise<void>
async function pasteOverload(pathUnranked: string[], text: string): Promise<void>
/** Parameter<...> doesn't handle function overload afaik, so we need to fix the types manually before exporting. */
async function pasteOverload(pathUnranked: string | string[], text?: string): Promise<void> {
  /** */
}

const helpers = {
  $,
  click,
  clickBullet,
  clickThought,
  down,
  getComputedColor,
  getEditable,
  getEditingText,
  getSelection,
  newThought,
  paste,
  press,
  remove,
  refresh,
  screenshot,
  scroll,
  type,
  waitForContextHasChildWithValue,
  waitForEditable,
  waitUntil,
  waitForHiddenEditable,
  waitForState,
  waitForThoughtExistInDb,
}

/** Setup up the Page instance for all helpers and returns an index of test helpers with the Page instance partially applied. Passes arguments to the setup function. */
const index = <T extends any[]>(...setupArgs: T) => {
  const pageRef = {} as { current?: Page }
  const index = partialWithRef(pageRef, helpers)

  beforeEach(async () => {
    pageRef.current = await setup(...setupArgs)
  })

  afterEach(async () => {
    if (pageRef.current) {
      await pageRef.current.browserContext().close()
    }
  })

  return index as typeof index & {
    paste: typeof pasteOverload
  }
}

export default index
