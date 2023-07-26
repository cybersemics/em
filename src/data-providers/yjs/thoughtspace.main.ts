import { wrap } from 'comlink'
import ThoughtspaceWorker, { api } from './thoughtspace.worker'

// Instantiate worker
const worker = new ThoughtspaceWorker()
const workerApi = wrap<typeof api>(worker)

/** Call the Worker api. */
const run = () => {
  workerApi.init('Worker').then((message: string) => {
    console.info(message)
  })
}

export default run
