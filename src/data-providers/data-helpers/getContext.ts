import { Context, State } from '../../@types'
import { getParent } from '../../selectors'
import { DataProvider } from '../DataProvider'

/** Gets the Parent for a context. */
const getContext = async (state: State, provider: DataProvider, context: Context) => {
  const parent = getParent(state, context)
  return parent ? provider.getContextById(parent.id) : Promise.resolve(undefined)
}

export default getContext
