import React, { FC } from 'react'
import { connect } from 'react-redux'
import { exists, getContexts, rootedParentOf } from '../selectors'
import { HOME_TOKEN } from '../constants'
import { parentOf, equalArrays, head, headValue, pathToContext } from '../util'
import { State } from '../util/initialState'
import { Child, Context, Index, SimplePath } from '../types'

interface SuperscriptProps {
  contextViews?: Index<boolean>,
  empty?: boolean,
  numContexts?: number,
  showContexts?: boolean,
  showModal?: string | null,
  showSingle?: boolean,
  superscript?: boolean,
  thoughts?: Context,
  simplePath: SimplePath,
  simplePathLive?: SimplePath,
  thoughtRaw?: Child,
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: SuperscriptProps) => {

  const { contextViews, cursor, showHiddenThoughts, showModal } = state
  const cursorContext = cursor ? pathToContext(cursor) : [HOME_TOKEN]

  const editing = equalArrays(cursorContext, pathToContext(props.simplePath || [])) && exists(state, headValue(cursor || []))

  const simplePath = props.showContexts && props.simplePath
    ? rootedParentOf(state, props.simplePath)
    : props.simplePath

  const thoughts = props.thoughts || pathToContext(simplePath)

  const thoughtsLive = editing
    ? props.showContexts ? parentOf(cursorContext) : cursorContext
    : thoughts

  const simplePathLive = editing
    ? parentOf(props.simplePath).concat(head(cursor!)) as SimplePath
    : simplePath

  /** Gets the number of contexts of the thoughtsLive signifier. */
  const numContexts = () => {
    const contexts = getContexts(state, head(thoughtsLive))
    // thoughtContext.context should never be undefined, but unfortunately I have personal thoughts in production with no context. I am not sure whether this was old data, or if it's still possible to encounter, so guard against undefined context for now.
    return (showHiddenThoughts
      ? contexts
      : contexts.filter(cx => !cx.context || cx.context.indexOf('=archive') === -1)
    ).length
  }

  return {
    contextViews,
    thoughts,
    simplePathLive,
    simplePath,
    // thoughtRaw is the head that is removed when showContexts is true
    thoughtRaw: props.showContexts ? head(props.simplePath) : head(simplePathLive),
    empty: thoughtsLive.length > 0 ? head(thoughtsLive).length === 0 : true, // ensure re-render when thought becomes empty
    numContexts: exists(state, head(thoughtsLive)) ? numContexts() : 0,
    showModal,
  }
}

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<SuperscriptProps> = ({ empty, numContexts, showSingle, superscript = true }) => {

  // showContexts = showContexts || isContextViewActive(store.getState(), simplePath)
  // const numDescendantCharacters = getDescendants(showContexts ? simplePathLive.concat(thoughtRaw) : simplePathLive )
  //   .reduce((charCount, child) => charCount + child.length, 0)

  return <span className='superscript-container'>{!empty && superscript && numContexts! > (showSingle ? 0 : 1)
    ? <span className='num-contexts'> {/* Make the container position:relative so that the modal is positioned correctly */}
      {numContexts ? <sup>{numContexts}</sup> : null}

      {/* render the depth-bar inside the superscript so that it gets re-rendered with it */}
      {/* <DepthBar/> */}

    </span>

    : null/* <DepthBar/> */}

  </span>
}

export default connect(mapStateToProps)(Superscript)
