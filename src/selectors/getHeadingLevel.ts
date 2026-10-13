import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HeadingLevel } from '../commands/headings'
import findDescendant from './findDescendant'

/** The heading levels a thought can be set to, in order. The heading action allows a thought only one of them. */
const levels = [1, 2, 3, 4, 5] as const

/** Returns the heading level of a thought, i.e. N for a thought with an =headingN attribute, or 0 for normal text. */
const getHeadingLevel = (state: State, thoughtId: ThoughtId): HeadingLevel =>
  levels.find(level => findDescendant(state, thoughtId, `=heading${level}`)) ?? 0

export default getHeadingLevel
