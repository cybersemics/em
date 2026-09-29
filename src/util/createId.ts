import ThoughtId from '../@types/ThoughtId'

/** Creates a 128-bit random hex identifier compatible with treecrdt NodeId (32 lowercase hex chars, 16 bytes). */
const createId = (): ThoughtId => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let hex = ''
  for (const b of bytes) hex += b.toString(16).padStart(2, '0')
  return hex as ThoughtId
}

export default createId
