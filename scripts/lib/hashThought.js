import murmurHash3 from 'murmurhash3js'
import normalizeThought from './normalizeThought.js'

const hashThought = value => murmurHash3.x64.hash128(normalizeThought(value))

export default hashThought
