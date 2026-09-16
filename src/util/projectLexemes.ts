import type Index from '../@types/IndexType'
import type Lexeme from '../@types/Lexeme'
import type Thought from '../@types/Thought'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN } from '../constants'
import hashThought from './hashThought'

const ROOT_IDS = new Set<string>([GLOBAL_ROOT_TOKEN, HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN])

/** Projects changed thoughts over known memberships without discarding unloaded occurrences. */
const projectLexemes = (lexemeIndex: Index<Lexeme>, thoughtUpdates: Index<Thought | null>): Index<Lexeme> => {
  const hashByThoughtId: Index<string | null> = {}
  const thoughtsByHash = new Map<string, Thought[]>()
  Object.entries(thoughtUpdates).forEach(([id, thought]) => {
    if (ROOT_IDS.has(id)) return
    const hash = thought ? hashThought(thought.value) : null
    hashByThoughtId[id] = hash
    if (!thought || hash === null) return
    const groupedThoughts = thoughtsByHash.get(hash)
    if (groupedThoughts) groupedThoughts.push(thought)
    else thoughtsByHash.set(hash, [thought])
  })
  if (Object.keys(hashByThoughtId).length === 0) return lexemeIndex

  let nextLexemeIndex = lexemeIndex
  Object.entries(lexemeIndex).forEach(([hash, lexeme]) => {
    const contexts = lexeme.contexts.filter(id => !(id in hashByThoughtId) || hashByThoughtId[id] === hash)
    if (contexts.length === lexeme.contexts.length) return
    if (nextLexemeIndex === lexemeIndex) nextLexemeIndex = { ...lexemeIndex }
    if (contexts.length) nextLexemeIndex[hash] = { ...lexeme, contexts }
    else delete nextLexemeIndex[hash]
  })

  thoughtsByHash.forEach((thoughts, hash) => {
    const lexeme = nextLexemeIndex[hash]
    const contexts = new Set(lexeme?.contexts)
    let created = lexeme?.created ?? thoughts[0].created
    let latest: Lexeme | Thought = lexeme ?? thoughts[0]
    thoughts.forEach(thought => {
      contexts.add(thought.id)
      if (thought.created < created) created = thought.created
      if (thought.lastUpdated >= latest.lastUpdated) latest = thought
    })
    if (
      lexeme &&
      contexts.size === lexeme.contexts.length &&
      created === lexeme.created &&
      latest.lastUpdated === lexeme.lastUpdated &&
      latest.updatedBy === lexeme.updatedBy
    )
      return
    if (nextLexemeIndex === lexemeIndex) nextLexemeIndex = { ...lexemeIndex }
    nextLexemeIndex[hash] = {
      contexts: lexeme && contexts.size === lexeme.contexts.length ? lexeme.contexts : [...contexts],
      created,
      lastUpdated: latest.lastUpdated,
      updatedBy: latest.updatedBy,
    }
  })
  return nextLexemeIndex
}

export default projectLexemes
