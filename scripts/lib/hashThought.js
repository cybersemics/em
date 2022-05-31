const murmurHash3 = require('murmurhash3js')
const normalizeThought = require('./normalizeThought')

const hashThought = value => murmurHash3.x64.hash128(normalizeThought(value))

module.exports = hashThought
