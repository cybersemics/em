// Determine whether an indexed thought is archived or not.
export const isArchived = indexedThought =>
  !indexedThought.contexts.some(context => context.context.indexOf('=archive') === -1) || false
