import { SimplePath, Timestamp } from '../types'
import { State } from './initialState'
import { importJSON } from './importJSON'
import { Block } from '../action-creators/importText'
import { RoamBlock, RoamPage } from 'roam'
import { timestamp } from './timestamp'

/**
 * Creates a Block with edit-email value as child.
 */
const editEmailToBlock = (email: string): Block => ({ scope: '=edit-email', children: [{ scope: email, children: [] }] })

/**
 * Creates a Block with create-email value as child.
 */
const createEmailToBlock = (email: string): Block => ({ scope: '=create-email', children: [{ scope: email, children: [] }] })

/**
 * Recursively converts the Roam children to blocks.
 */
const roamBlocksToBlocks = (children: RoamBlock[]): Block[] => children.map(({
  string,
  children,
  'edit-time': editTime,
  'create-time': createTime,
  'create-email': createEmail,
  'edit-email': editEmail
}) => ({
  scope: string,
  created: new Date(createTime).toISOString() as Timestamp,
  lastUpdated: editTime ? new Date(editTime).toISOString() as Timestamp : timestamp(),
  children: [
    ...children && children.length ? roamBlocksToBlocks(children) : [],
    createEmailToBlock(createEmail),
    ...editEmail ? [editEmailToBlock(editEmail)] : []
  ]
}))

/**
 * Converts the Roam to an array of blocks.
 */
const roamJsonToBlocks = (roam: RoamPage[]) => roam.map((item: RoamPage) => ({
  scope: item.title,
  children: roamBlocksToBlocks(item.children)
}))

/**
 * Parses Roam and generates { contextIndexUpdates, thoughtIndexUpdates } that can be sync'd to state.
 */
export const importRoam = (state: State, simplePath: SimplePath, roam: RoamPage[]) => {
  const thoughtsJSON = roamJsonToBlocks(roam)
  return importJSON(state, simplePath, thoughtsJSON, { skipRoot: false })
}
