import { SimplePath } from '../types'
import { State } from './initialState'
import { importJSON } from './importJSON'
import { Block } from '../action-creators/importText'
import { RoamBlock, RoamPage } from 'roam'

/**
 * Recursively converts the roam children to blocks.
 */
const convertRoamBlocksToBlocks = (children: RoamBlock[]): Block[] => children.map(child => ({
  scope: child.string,
  children: child.children && child.children.length ? convertRoamBlocksToBlocks(child.children) : []
}))

/**
 * Converts the ROAM JSON to an array of blocks.
 */
const roamJsontoBlocks = (ROAM: RoamPage[]) => {

  return ROAM.map((item: RoamPage) => {
    return {
      scope: item.title,
      children: convertRoamBlocksToBlocks(item.children)
    }
  })
}

/**
 * Parses ROAM JSON and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 */
export const importROAM = (state: State, thoughtsRanked: SimplePath, ROAM: RoamPage[]) => {
  const thoughtsJSON = roamJsontoBlocks(ROAM)
  return importJSON(state, thoughtsRanked, thoughtsJSON, { skipRoot: false })
}
