/* Strongly typed local storage model. */
import storage from '../util/storage'

const storageModel = storage.model({
  fontSize: {
    default: 18,
    decode: (s: string | null) => (s ? +s : undefined),
  },
})

export default storageModel
