import Block from '../@types/Block'
import Timestamp from '../@types/Timestamp'
import timestamp from './timestamp'

export interface RoamBlock {
  uid: string
  string: string
  'create-email': string
  'create-time': number
  children?: RoamBlock[]
  'edit-time'?: number
  'edit-email'?: string
}

export interface RoamPage {
  title: string
  children: RoamBlock[]
}

/**
 * Creates a Block with edit-email value as child.
 */
const editEmailToBlock = (email: string, lastUpdated: Timestamp = timestamp()): Block => ({
  scope: '=edit-email',
  children: [
    {
      scope: email,
      children: [],
    },
  ],
  lastUpdated,
})

/**
 * Creates a Block with create-email value as child.
 */
const createEmailToBlock = (email: string, lastUpdated: Timestamp = timestamp()): Block => ({
  scope: '=create-email',
  children: [
    {
      scope: email,
      children: [],
    },
  ],
  lastUpdated,
})

/**
 * Recursively converts the Roam children to blocks.
 */
const roamBlocksToBlocks = (children: RoamBlock[]): Block[] =>
  children.map(
    ({
      string,
      children,
      'edit-time': editTime,
      'create-time': createTime,
      'create-email': createEmail,
      'edit-email': editEmail,
    }) => {
      const created = (createTime as Timestamp) || timestamp()
      const lastUpdated = (editTime as Timestamp) || timestamp()
      return {
        scope: string,
        created,
        lastUpdated,
        children: [
          ...(children && children.length ? roamBlocksToBlocks(children) : []),
          createEmailToBlock(createEmail, lastUpdated),
          ...(editEmail ? [editEmailToBlock(editEmail, lastUpdated)] : []),
        ],
      }
    },
  )

/**
 * Converts the Roam to an array of blocks.
 */
const roamJsonToBlocks = (roam: RoamPage[]) =>
  roam.map((item: RoamPage) => ({
    scope: item.title,
    children: roamBlocksToBlocks(item.children),
  }))

export default roamJsonToBlocks
