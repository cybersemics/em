import pluralize from 'pluralize'
import ThoughtId from '../@types/ThoughtId'
import ellipsize from '../util/ellipsize'
import isRoot from '../util/isRoot'

interface Options {
  // override the name of the root thought being exported
  value?: string
}

/** Generates a user-friendly phrase describing how many thoughts will be exported. */
const exportPhrase = (idOrIds: ThoughtId | ThoughtId[], numDescendants: number | null, { value }: Options = {}) => {
  if (Array.isArray(idOrIds) && idOrIds.length > 1) {
    return `${idOrIds.length} thoughts ${numDescendants ? ` and ${pluralize('subthought', numDescendants, true)}` : ''}`
  }

  const id = Array.isArray(idOrIds) ? idOrIds[0] : idOrIds

  // presumably getThoughtById will never fail, but guard for safety
  const label = ellipsize(value || 'thought')

  return isRoot([id])
    ? numDescendants === 1
      ? '1 thought'
      : `all${numDescendants ? ' ' + numDescendants.toLocaleString() : ''} thoughts`
    : `"${label}"${numDescendants ? ` and ${pluralize('subthought', numDescendants, true)}` : ''}`
}

export default exportPhrase
