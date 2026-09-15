import type Index from '../@types/IndexType'
import type Lexeme from '../@types/Lexeme'
import type Thought from '../@types/Thought'
import { ABSOLUTE_TOKEN, EM_TOKEN, GLOBAL_ROOT_TOKEN, HOME_TOKEN } from '../constants'
import hashThought from './hashThought'

/** Projects changed thoughts over known memberships without discarding unloaded occurrences. */
const projectLexemes = (lexemeIndex: Index<Lexeme>, thoughts: Index<Thought | null>): Index<Lexeme> => {
  if (Object.keys(thoughts).length === 0) return lexemeIndex
  const lexemes = { ...lexemeIndex }
  const keys = Object.fromEntries(
    Object.entries(thoughts)
      .filter(([id]) => ![GLOBAL_ROOT_TOKEN, HOME_TOKEN, EM_TOKEN, ABSOLUTE_TOKEN].includes(id))
      .map(([id, thought]) => [id, thought ? hashThought(thought.value) : null]),
  )
  Object.entries(lexemes).forEach(([key, lexeme]) => {
    const contexts = lexeme.contexts.filter(id => !(id in keys) || keys[id] === key)
    if (contexts.length === lexeme.contexts.length) return
    if (contexts.length) lexemes[key] = { ...lexeme, contexts }
    else delete lexemes[key]
  })
  Object.entries(thoughts).forEach(([id, thought]) => {
    const key = keys[id]
    if (!thought || key == null) return
    const lexeme = lexemes[key]
    lexemes[key] = {
      contexts: lexeme?.contexts.includes(thought.id) ? lexeme.contexts : [...(lexeme?.contexts ?? []), thought.id],
      created: lexeme && lexeme.created < thought.created ? lexeme.created : thought.created,
      lastUpdated: lexeme && lexeme.lastUpdated > thought.lastUpdated ? lexeme.lastUpdated : thought.lastUpdated,
      updatedBy: lexeme && lexeme.lastUpdated > thought.lastUpdated ? lexeme.updatedBy : thought.updatedBy,
    }
  })
  return lexemes
}

export default projectLexemes
