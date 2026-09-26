import { startCase } from 'lodash'
import Patch from '../@types/Patch'

/** Returns the display label of the latest non-navigation patch. Command labels are already authored for display;
 * action types and action-level labels are converted from camel case. */
const getLatestActionLabel = (patches: Patch[], n = 1): string | undefined => {
  const patch = patches[patches.length - n]
  if (!patch) return undefined
  if (patch.metadata.isNavigation) return getLatestActionLabel(patches, n + 1)
  return patch.metadata.source === 'command'
    ? patch.metadata.label
    : startCase(patch.metadata.label ?? patch.metadata.actionTypes[0])
}

export default getLatestActionLabel
