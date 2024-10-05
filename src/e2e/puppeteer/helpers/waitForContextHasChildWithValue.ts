import { Page } from 'puppeteer'
import Context from '../../../@types/Context'
import Thought from '../../../@types/Thought'
import { WindowEm } from '../../../initialize'

declare module global {
  const page: Page;
}

/**
 * Wait until given context has a child with given value.
 */
const waitForContextHasChildWithValue = async (context: Context, childValue: string) =>
  await global.page.waitForFunction(
    (context: Context, childValue: string) =>
      (window.em as WindowEm)
        .getAllChildrenAsThoughts(context)
        .some((thought: Thought) => thought.value === childValue) && (window.em as WindowEm).getLexeme(childValue),
    {},
    context,
    childValue,
  )

export default waitForContextHasChildWithValue
