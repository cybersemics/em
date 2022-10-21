import React, { FC, useEffect, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import hasLexeme from '../selectors/hasLexeme'
import { store } from '../store'
import equalArrays from '../util/equalArrays'
import head from '../util/head'
import headValue from '../util/headValue'
import isVisibleContext from '../util/isVisibleContext'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'

interface SuperscriptProps {
  contextViews?: Index<boolean>
  showSingle?: boolean
  superscript?: boolean
  simplePath: SimplePath
  thoughts?: Context
}

const NO_CONTEXTS: ThoughtId[] = []

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<SuperscriptProps> = ({ showSingle, simplePath, superscript = true, thoughts }) => {
  const [numContexts, setNumContexts] = useState(0)
  const ref = useRef<HTMLElement>(null)

  const showHiddenThoughts = useSelector((state: State) => state.showHiddenThoughts)
  const simplePathLive = useSelector((state: State) => {
    const cursorContext = state.cursor ? pathToContext(state, state.cursor) : [HOME_TOKEN]
    const editing =
      state.cursor &&
      equalArrays(cursorContext, pathToContext(state, simplePath || [])) &&
      hasLexeme(state, headValue(state, state.cursor))
    return editing ? (parentOf(simplePath).concat(head(state.cursor!)) as SimplePath) : simplePath
  }, shallowEqual)

  const show = useSelector((state: State) => {
    const value = getThoughtById(state, head(simplePathLive))?.value || ''
    const emptyThought = value.length === 0
    return !emptyThought && superscript && numContexts! > (showSingle ? 0 : 1)
  })

  const contexts = useSelector(
    (state: State) => (show ? getContexts(state, head(simplePathLive || simplePath)) : NO_CONTEXTS),
    shallowEqual,
  )

  // delay filtering for performance
  // recalculate when Lexeme contexts are loaded
  // Note: This results in a total running time for all superscripts of O(totalNumberOfContexts * depth)
  useEffect(() => {
    window.requestAnimationFrame(() => {
      if (!ref.current) return
      setNumContexts(contexts.filter(id => isVisibleContext(store.getState(), id)).length)
    })
  }, [contexts, showHiddenThoughts])

  return (
    <span ref={ref} className='superscript-container'>
      {show && numContexts && <span className='num-contexts'> {numContexts && <sup>{numContexts}</sup>}</span>}
    </span>
  )
}

const SuperscriptMemo = React.memo(Superscript)
SuperscriptMemo.displayName = 'Superscript'

export default SuperscriptMemo
