/* Strongly typed local storage model. */
import storage from '../util/storage'

const storageModel = storage.model({
  defaults: {
    fontSize: 18,
  },
  decoders: {
    fontSize: (s: string | null) => (s ? +s : 18),
  },
  encoders: {},
})

export default storageModel
