import React, { FC, useEffect, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import head from '../util/head'
import isVisibleContext from '../util/isVisibleContext'

interface SuperscriptProps {
  contextViews?: Index<boolean>
  showSingle?: boolean
  superscript?: boolean
  simplePath: SimplePath
}

const NO_CONTEXTS: ThoughtId[] = []

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<SuperscriptProps> = ({ showSingle, simplePath, superscript = true }) => {
  const [numContexts, setNumContexts] = useState(0)
  const ref = useRef<HTMLElement>(null)

  const showHiddenThoughts = useSelector(state => state.showHiddenThoughts)

  const show = useSelector(state => {
    const value = getThoughtById(state, head(simplePath))?.value || ''
    const emptyThought = value.length === 0
    return !emptyThought && superscript && numContexts! > (showSingle ? 0 : 1)
  })

  const contexts = useSelector(state => (show ? getContexts(state, head(simplePath)) : NO_CONTEXTS), shallowEqual)

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
