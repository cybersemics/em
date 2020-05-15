//@ts-nocheck

/** Renders a list of thoughts as a sentence. */
export const conjunction = thoughts =>
  thoughts.slice(0, thoughts.length - 1).join(', ') + (thoughts.length !== 2 ? ',' : '') + ' and ' + thoughts[thoughts.length - 1]
