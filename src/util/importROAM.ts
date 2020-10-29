import { SimplePath, Timestamp } from '../types'
import { State } from './initialState'
import { importJSON } from './importJSON'
import { Block } from '../action-creators/importText'
import { RoamBlock, RoamPage } from 'roam'
import { timestamp } from './timestamp'

/**
 * Recursively converts the roam children to blocks.
 */
const convertRoamBlocksToBlocks = (children: RoamBlock[]): Block[] => children.map(({ string, children, 'edit-time': editTime, 'create-time': createTime }) => ({
  scope: string,
  created: new Date(createTime).toISOString() as Timestamp,
  lastUpdated: editTime ? new Date(editTime).toISOString() as Timestamp : timestamp(),
  children: children && children.length ? convertRoamBlocksToBlocks(children) : []
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
export const importROAM = (state: State, simplePath: SimplePath, ROAM: RoamPage[]) => {
  const thoughtsJSON = roamJsontoBlocks(ROAM)
  return importJSON(state, simplePath, thoughtsJSON, { skipRoot: false })
}
