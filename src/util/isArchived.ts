import { Lexeme } from '../types'

/** Determines whether an indexed thought is archived or not. */
export const isArchived = (indexedThought: Lexeme) =>
  // root thought does not have a contexts property
  !(indexedThought.contexts || []).some(context => (context.context || []).indexOf('=archive') === -1) || false
