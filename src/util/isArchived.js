// Determine whether an indexed thought is archived or not.
export const isArchived = indexedThought =>
  indexedThought.contexts.filter(context => (context.context.indexOf('=archive') !== -1)) || false
