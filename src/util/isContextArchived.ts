import { Context } from '../types'

/** Check if the given context is archived or not. */
export const isContextArchived = (context: Context) => context.indexOf('=archive') !== -1
