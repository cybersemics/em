/** Determines whether an indexed thought is archived or not. */
export const isArchived = indexedThought =>
  // root thought does not have a contexts property
  !(indexedThought.contexts || []).some(context => (context.context || []).indexOf('=archive') === -1) || false
