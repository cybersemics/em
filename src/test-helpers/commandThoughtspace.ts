import createMemoryThoughtspace from '../data-providers/treecrdt/createMemoryThoughtspace'

/** Owns reducer fixtures independently of the live editor while exercising the production document engine. */
const commandThoughtspace = createMemoryThoughtspace()

export default commandThoughtspace
