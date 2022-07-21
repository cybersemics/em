import React, { FC, useEffect, useState } from 'react'
import { connect, useSelector } from 'react-redux'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import getAncestorByValue from '../selectors/getAncestorByValue'
import getContexts from '../selectors/getContexts'
import hasLexeme from '../selectors/hasLexeme'
import { store } from '../store'
import equalArrays from '../util/equalArrays'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'

interface SuperscriptProps {
  contextViews?: Index<boolean>
  showSingle?: boolean
  superscript?: boolean
  simplePath: SimplePath
  thoughts?: Context
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: SuperscriptProps) => {
  const { contextViews, cursor, showHiddenThoughts, showModal } = state
  const cursorContext = cursor ? pathToContext(state, cursor) : [HOME_TOKEN]

  const editing =
    cursor &&
    equalArrays(cursorContext, pathToContext(state, props.simplePath || [])) &&
    hasLexeme(state, headValue(state, cursor))

  const thoughts = props.thoughts || pathToContext(state, props.simplePath)

  const thoughtsLive = editing ? cursorContext : thoughts

  const simplePathLive = editing ? (parentOf(props.simplePath).concat(head(cursor!)) as SimplePath) : props.simplePath

  return {
    contextViews,
    empty: thoughtsLive.length > 0 ? head(thoughtsLive).length === 0 : true, // ensure re-render when thought becomes empty
    showHiddenThoughts,
    simplePathLive,
    thoughts,
    thoughtRaw: head(simplePathLive),
    showModal,
  }
}

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<ReturnType<typeof mapStateToProps> & SuperscriptProps> = ({
  empty,
  showSingle,
  showHiddenThoughts,
  simplePath,
  simplePathLive,
  superscript = true,
}) => {
  const [numContexts, setNumContexts] = useState(0)

  const contexts = useSelector((state: State) => getContexts(state, head(simplePathLive || simplePath)))

  /** Returns true if the thought is not archived. */
  const isNotArchive = (id: ThoughtId) => {
    const state = store.getState()
    return state.showHiddenThoughts || !getAncestorByValue(state, id, '=archive')
  }

  // delay rendering of superscript for performance
  // recalculate when Lexemes are loaded
  // filtering on isNotArchive is very slow: O(totalNumberOfContexts * depth)
  useEffect(() => {
    setNumContexts(contexts.filter(isNotArchive).length)
  }, [contexts, showHiddenThoughts])

  return (
    <span className='superscript-container'>
      {
        !empty && superscript && numContexts! > (showSingle ? 0 : 1) ? (
          <span className='num-contexts'> {numContexts ? <sup>{numContexts}</sup> : null}</span>
        ) : null /* <DepthBar/> */
      }
    </span>
  )
}

export default connect(mapStateToProps)(Superscript)
