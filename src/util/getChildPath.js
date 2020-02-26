import { head } from './head'
import { getThoughts } from './getThoughts'
import { hashThought } from './hashThought'
import { headValue } from './headValue'
import { rankThoughtsFirstMatch } from './rankThoughtsFirstMatch'
import { unroot } from './unroot'

export const getChildPath = (child, thoughtsRanked, showContexts) => {
  const value = showContexts ? head(child.context) : child.value

  const otherSubthought = (showContexts && child.context ? getThoughts(child.context) : [])
    .find(() => hashThought(value) === hashThought(headValue(thoughtsRanked)))
    || head(thoughtsRanked)

  const childPath = showContexts
    ? rankThoughtsFirstMatch(child.context).concat(otherSubthought)
    : unroot(thoughtsRanked).concat(child)

  return childPath
}
