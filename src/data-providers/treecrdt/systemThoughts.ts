import type Index from '../../@types/IndexType'
import type Lexeme from '../../@types/Lexeme'
import type Thought from '../../@types/Thought'
import type Timestamp from '../../@types/Timestamp'
import { ABSOLUTE_TOKEN, EM_TOKEN, HOME_TOKEN, ROOT_PARENT_ID, SETTINGS_TOKEN, SETTINGS_VALUE } from '../../constants'
import hashThought from '../../util/hashThought'

export const SYSTEM_ROOT_THOUGHT_IDS = [HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN] as const

/** Creates the fixed system thought graph used by TreeCRDT test storage. */
export const createSystemThoughtIndexes = (
  created: Timestamp = 0 as Timestamp,
): {
  thoughtIndex: Index<Thought>
  lexemeIndex: Index<Lexeme>
} => {
  const thoughtIndex: Index<Thought> = {}

  for (const id of SYSTEM_ROOT_THOUGHT_IDS) {
    thoughtIndex[id] = {
      id,
      value: id,
      rank: 0,
      created,
      lastUpdated: created,
      updatedBy: '',
      parentId: ROOT_PARENT_ID,
      childrenMap: {},
    }
  }

  thoughtIndex[EM_TOKEN] = {
    ...thoughtIndex[EM_TOKEN],
    childrenMap: {
      [SETTINGS_TOKEN]: SETTINGS_TOKEN,
    },
  }

  thoughtIndex[SETTINGS_TOKEN] = {
    id: SETTINGS_TOKEN,
    value: SETTINGS_VALUE,
    rank: 0,
    created,
    lastUpdated: created,
    updatedBy: '',
    parentId: EM_TOKEN,
    childrenMap: {},
  }

  return {
    thoughtIndex,
    lexemeIndex: {
      [hashThought(SETTINGS_VALUE)]: {
        contexts: [SETTINGS_TOKEN],
        created,
        lastUpdated: created,
        updatedBy: '',
      },
    },
  }
}

export default {
  SYSTEM_ROOT_THOUGHT_IDS,
  createSystemThoughtIndexes,
}
