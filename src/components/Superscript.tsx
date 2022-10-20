import _ from 'lodash'
import React, { FC, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { HOME_TOKEN } from '../constants'
import getContexts from '../selectors/getContexts'
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

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<SuperscriptProps> = ({ showSingle, simplePath, superscript = true, thoughts }) => {
  const [numContexts, setNumContexts] = useState(0)
  const ref = useRef<HTMLElement>(null)

  const showHiddenThoughts = useSelector((state: State) => state.showHiddenThoughts)

  const show = useSelector((state: State) => {
    const cursorContext = state.cursor ? pathToContext(state, state.cursor) : [HOME_TOKEN]
    const editing =
      state.cursor &&
      equalArrays(cursorContext, pathToContext(state, simplePath || [])) &&
      hasLexeme(state, headValue(state, state.cursor))

    const thoughtsLive = editing ? cursorContext : thoughts || pathToContext(state, simplePath)
    const empty = thoughtsLive.length > 0 ? head(thoughtsLive).length === 0 : true
    return !empty && superscript && numContexts! > (showSingle ? 0 : 1)
  })

  const contexts = useSelector((state: State) => {
    const cursorContext = state.cursor ? pathToContext(state, state.cursor) : [HOME_TOKEN]
    const editing =
      state.cursor &&
      equalArrays(cursorContext, pathToContext(state, simplePath || [])) &&
      hasLexeme(state, headValue(state, state.cursor))

    const simplePathLive = editing ? (parentOf(simplePath).concat(head(state.cursor!)) as SimplePath) : simplePath
    return getContexts(state, head(simplePathLive || simplePath))
  }, _.isEqual)

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
      {
        show ? (
          <span className='num-contexts'> {numContexts ? <sup>{numContexts}</sup> : null}</span>
        ) : null /* <DepthBar/> */
      }
    </span>
  )
}

export default Superscript
