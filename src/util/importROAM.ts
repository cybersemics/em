import { Path } from '../types'
import { State } from './initialState'
import { importJSON } from './importJSON'
import { Block } from '../action-creators/importText'
import { ROAMChild, RoamNode } from 'roam'

/**
 * Recursively converts the roam children to blocks.
 */
const convertROAMChildrenToBlocks = (children: ROAMChild[]): Block[] => children.map(child => ({
  scope: child.string,
  children: child.children && child.children.length ? convertROAMChildrenToBlocks(child.children) : []
}))

/**
 * Converts the ROAM JSON to an array of blocks.
 */
const convertROAMJSONToBlocks = (ROAM: RoamNode[]) => {

  return ROAM.map((item: RoamNode) => {
    return {
      scope: item.title,
      children: convertROAMChildrenToBlocks(item.children)
    }
  })
}

/**
 * Parses ROAM JSON and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 */
export const importROAM = (state: State, thoughtsRanked: Path, ROAM: RoamNode[]) => {
  const thoughtsJSON = convertROAMJSONToBlocks(ROAM)
  return importJSON(state, thoughtsRanked, thoughtsJSON, { skipRoot: false })
}
