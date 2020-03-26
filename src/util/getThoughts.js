import { store } from '../store.js'

import getThoughtsOfEncodedContext from '../selectors/getThoughtsOfEncodedContext'

import {
  hashContext
} from '../util'

/** Returns the subthoughts of the given context unordered. */
export const getThoughts = (context, thoughtIndex, contextIndex = store.getState().contextIndex) =>
  getThoughtsOfEncodedContext({ contextIndex }, hashContext(context))
