import React, { FC, useEffect, useRef, useState } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { SystemStyleObject } from '../../styled-system/types'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import store from '../stores/app'
import head from '../util/head'
import isVisibleContext from '../util/isVisibleContext'
import StaticSuperscript from './StaticSuperscript'

interface SuperscriptProps {
  contextViews?: Index<boolean>
  showSingle?: boolean
  superscript?: boolean
  simplePath: SimplePath
  cssRaw?: SystemStyleObject
}

const NO_CONTEXTS: ThoughtId[] = []

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<SuperscriptProps> = ({ showSingle, simplePath, cssRaw }) => {
  const [numContexts, setNumContexts] = useState(0)
  const ref = useRef<HTMLElement>(null)

  const showHiddenThoughts = useSelector(state => state.showHiddenThoughts)

  const show = useSelector(state => {
    const value = getThoughtById(state, head(simplePath))?.value || ''
    const emptyThought = value.length === 0
    return !emptyThought && numContexts! > (showSingle ? 0 : 1)
  })

  const contexts = useSelector(state => (show ? getContexts(state, head(simplePath)) : NO_CONTEXTS), shallowEqual)

  // delay filtering for performance
  // recalculate when Lexeme contexts are loaded
  // Note: This results in a total running time for all superscripts of O(totalNumberOfContexts * depth)
  useEffect(() => {
    const updateNumContexts = () => {
      if (!ref.current) return
      setNumContexts(contexts.filter(id => isVisibleContext(store.getState(), id)).length)
    }

    // In test environments (when navigator.webdriver is true), update synchronously to avoid flaky tests
    // In production, use requestAnimationFrame for better performance
    if (typeof navigator !== 'undefined' && navigator.webdriver) {
      updateNumContexts()
    } else {
      window.requestAnimationFrame(updateNumContexts)
    }
  }, [contexts, showHiddenThoughts])

  return <StaticSuperscript ref={ref} show={!!(show && numContexts)} n={numContexts} cssRaw={cssRaw} hideZero />
}

const SuperscriptMemo = React.memo(Superscript)
SuperscriptMemo.displayName = 'Superscript'

export default SuperscriptMemo
