import React, { FC, useEffect, useState } from 'react'
import { connect, useSelector } from 'react-redux'
import { store } from '../store'
import hasLexeme from '../selectors/hasLexeme'
import getContexts from '../selectors/getContexts'
import rootedParentOf from '../selectors/rootedParentOf'
import getAncestorByValue from '../selectors/getAncestorByValue'
import { HOME_TOKEN } from '../constants'
import parentOf from '../util/parentOf'
import equalArrays from '../util/equalArrays'
import head from '../util/head'
import headValue from '../util/headValue'
import pathToContext from '../util/pathToContext'
import ThoughtId from '../@types/ThoughtId'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'

interface SuperscriptProps {
  contextViews?: Index<boolean>
  showContexts?: boolean
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

  const simplePath = props.showContexts && props.simplePath ? rootedParentOf(state, props.simplePath) : props.simplePath

  const thoughts = props.thoughts || pathToContext(state, simplePath)

  const thoughtsLive = editing ? (props.showContexts ? parentOf(cursorContext) : cursorContext) : thoughts

  const simplePathLive = editing ? (parentOf(props.simplePath).concat(head(cursor!)) as SimplePath) : simplePath

  return {
    contextViews,
    empty: thoughtsLive.length > 0 ? head(thoughtsLive).length === 0 : true, // ensure re-render when thought becomes empty
    showHiddenThoughts,
    simplePathLive,
    simplePath,
    thoughts,
    // thoughtRaw is the head that is removed when showContexts is true
    thoughtRaw: props.showContexts ? head(props.simplePath) : head(simplePathLive),
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
