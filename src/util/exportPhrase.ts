import ThoughtId from '../@types/ThoughtId'
import ellipsize from '../util/ellipsize'
import isRoot from '../util/isRoot'

interface Options {
  // override the name of the root thought being exported
  value?: string
}

/** Generates a user-friendly phrase describing how many thoughts will be exported. */
const exportPhrase = (id: ThoughtId, numDescendants: number | null, { value }: Options = {}) => {
  // presumably getThoughtById will never fail, but guard for safety
  const label = ellipsize(value || 'thought')

  return isRoot([id])
    ? numDescendants === 1
      ? '1 thought'
      : ` all${numDescendants ? ' ' + numDescendants.toLocaleString() : ''} thoughts`
    : `"${label}"${
        numDescendants ? ` and ${numDescendants.toLocaleString()} subthought${numDescendants === 1 ? '' : 's'}` : ''
      }`
}

export default exportPhrase
