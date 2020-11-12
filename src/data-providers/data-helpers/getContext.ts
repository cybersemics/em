import { Context } from '../../types'
import { hashContext } from '../../util'
import { DataProvider } from '../DataProvider'

/** Gets the Parent for a context. */
const getContext = async (provider: DataProvider, context: Context) =>
  provider.getContextById(hashContext(context))

export default getContext
