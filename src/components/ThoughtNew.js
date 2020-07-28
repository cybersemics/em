import React from 'react'

import { connect } from 'react-redux'
// import { store } from '../store'
import globals from '../globals'
import assert from 'assert'

// components
import ThoughtAnnotation from './ThoughtAnnotation'
import GestureDiagram from './GestureDiagram'

// constants
import {
  MAX_DISTANCE_FROM_CURSOR,
} from '../constants'

import { formatKeyboardShortcut, shortcutById } from '../shortcuts'

// util
import {
  contextOf,
  equalPath,
  head,
  headValue,
  isRoot,
  isURL,
  publishMode,
  rootedContextOf,
  subsetThoughts,
} from '../util'

// selectors
import {
  attribute,
  chain,
  getThought,
  getThoughtsRanked,
} from '../selectors'
import ContentEditable from 'react-contenteditable'
import { animated, useSpring } from 'react-spring'
import { motion } from 'framer-motion'
import { isMobile } from '../browser'

// assert shortcuts at load time
const subthoughtShortcut = shortcutById('newSubthought')
const toggleContextViewShortcut = shortcutById('toggleContextView')
assert(subthoughtShortcut)
assert(toggleContextViewShortcut)

/**********************************************************************
 * Redux
 **********************************************************************/

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state, props) => {

  const {
    codeView,
    cursor,
    cursorOffset,
    cursorBeforeEdit,
    expanded,
    expandedContextThought,
    search,
    showHiddenThoughts,
  } = state

  const {
    contextChain,
    thoughtsRanked,
    showContexts,
    depth,
    childrenForced,
    thoughtsResolved
  } = props

  // check if the cursor path includes the current thought
  const isEditingPath = subsetThoughts(cursorBeforeEdit, thoughtsResolved)

  // check if the cursor is editing a thought directly
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)

  const thoughtsRankedLive = isEditing
    ? contextOf(thoughtsRanked).concat(head(showContexts ? contextOf(cursor) : cursor))
    : thoughtsRanked

  const distance = cursor ? Math.max(0,
    Math.min(MAX_DISTANCE_FROM_CURSOR, cursor.length - depth)
  ) : 0

  const isCursorParent = distance === 2
    // grandparent
    ? equalPath(rootedContextOf(contextOf(cursor || [])), chain(state, contextChain, thoughtsRanked)) && getThoughtsRanked(state, cursor).length === 0
    // parent
    : equalPath(contextOf(cursor || []), chain(state, contextChain, thoughtsRanked))

  let contextBinding // eslint-disable-line fp/no-let
  try {
    contextBinding = JSON.parse(attribute(state, thoughtsRankedLive, '=bindContext'))
  }
  catch (err) {
  }

  const isCursorGrandparent =
    equalPath(rootedContextOf(contextOf(cursor || [])), chain(state, contextChain, thoughtsRanked))
  const children = childrenForced || getThoughtsRanked(state, contextBinding || thoughtsRankedLive)

  const value = headValue(thoughtsRankedLive)

  // link URL
  const url = isURL(value) ? value :
  // if the only subthought is a url and the thought is not expanded, link the thought
    !expanded && children.length === 1 && children[0].value && isURL(children[0].value) && (!cursor || !equalPath(thoughtsRankedLive, contextOf(cursor))) ? children[0].value :
    null

  const thought = getThought(state, value)

  return {
    contextBinding,
    cursorOffset,
    distance,
    isPublishChild: !search && publishMode() && thoughtsRanked.length === 2,
    isCursorParent,
    isCursorGrandparent,
    expandedContextThought,
    isCodeView: cursor && equalPath(codeView, props.thoughtsRanked),
    isEditing,
    isEditingPath,
    publish: !search && publishMode(),
    showHiddenThoughts,
    thought,
    thoughtsRankedLive,
    view: attribute(state, thoughtsRankedLive, '=view'),
    url,
  }
}

/** A message that says there are no children in this context. */
const NoChildren = ({ allowSingleContext, childrenLength, thoughtsRanked }) =>
  <div className='children-subheading text-note text-small' style={{ marginLeft: '1.5rem' }}>

    This thought is not found in any {childrenLength === 0 ? '' : 'other'} contexts.<br /><br />

    <span>{isMobile
      ? <span className='gesture-container'>Swipe <GestureDiagram path={subthoughtShortcut.gesture} size='30' color='darkgray' /></span>
      : <span>Type {formatKeyboardShortcut(subthoughtShortcut.keyboard)}</span>
    } to add "{headValue(thoughtsRanked)}" to a new context.
    </span>

    <br />{allowSingleContext
      ? 'A floating context... how interesting.'
      : <span>{isMobile
        ? <span className='gesture-container'>Swipe <GestureDiagram path={toggleContextViewShortcut.gesture} size='30' color='darkgray'/* mtach .children-subheading color */ /></span>
        : <span>Type {formatKeyboardShortcut(toggleContextViewShortcut.keyboard)}</span>
      } to return to the normal view.</span>
    }
  </div>

/**********************************************************************
 * Components
 **********************************************************************/

/**
 * Bullet component with animation.
 */
const Bullet = ({ expanded, isCursor, hasChildren }) => {

  const TEXT_SELECTION_OPCAITY = 0.3
  const { rotation, selectionOpacity } = useSpring({
    rotation: expanded ? 90 : 0,
    selectionOpacity: isCursor ? TEXT_SELECTION_OPCAITY : 0,
  })

  return (
    <animated.div
      style={{
        height: '0.86rem',
        width: '0.86rem',
        marginTop: '0.25rem',
        borderRadius: '50%',
        display: 'flex',
        marginRight: '0.4rem',
        justifyContent: 'center',
        alignItems: 'center',
        ...selectionOpacity ? {
          background: selectionOpacity.interpolate(
            o => `rgba(255,255,255,${o})`
          ) } : {}
      }}
    >
      <animated.span
        style={{
          ...rotation ? { transform: rotation.interpolate(r => `rotate(${r}deg)`) } : {},
          fontSize: '0.94rem',
        }}
      >
        {hasChildren ? '▸' : '•'}
      </animated.span>
    </animated.div>
  )
}

/** A thought container with bullet, thought annotation, thought, and subthoughts.
 *
  @param allowSingleContext  Pass through to Subthoughts since the SearchSubthoughts component does not have direct access to the Subthoughts of the Subthoughts of the search. Default: false.
 */
const ThoughtContainer = ({
  childrenLength,
  contextChain,
  showContexts,
  thoughtsRanked,
  thoughtsResolved,
  url,
  expandedContextThought,
  value,
  isCursor,
  expanded,
  isContextViewActive,
  hasContext,
  hasChildren,
  id
}) => {

  const homeContext = showContexts && isRoot([head(contextOf(thoughtsRanked))])

  const showContextBreadcrumbs = showContexts &&
    (!globals.ellipsizeContextThoughts || equalPath(thoughtsRanked, expandedContextThought)) &&
    thoughtsRanked.length > 2

  return (
    <div>
      <motion.div layout style={{
        display: 'flex'
      }}>
        <Bullet expanded={expanded} isCursor={isCursor} hasChildren={hasChildren}/>
        <div style={{ flex: 1, display: 'flex' }}>
          <ThoughtAnnotation
            contextChain={contextChain}
            homeContext={homeContext}
            minContexts={2}
            showContextBreadcrumbs={showContextBreadcrumbs}
            showContexts={showContexts}
            style={{}}
            thoughtsRanked={thoughtsRanked}
            url={url}
          />
          <div style={{
            flex: 1
          }}>
            { !homeContext &&
            <ContentEditable
              style={{
                height: '100%',
                width: '100%',
                wordWrap: 'break-word',
                wordBreak: 'break-all',
              }}
              html={value}
              placeholder="Add a thought"
            />
            }
          </div>
        </div>
      </motion.div>
      {expanded && isContextViewActive &&
        (
          hasContext ? <motion.div layout className="children-subheading text-note text-small" style={{ margin: '0', marginLeft: '1.5rem', marginTop: '0.35rem', padding: 0 }}>
            <em>Contexts:</em>
          </motion.div> : <NoChildren thoughtsRanked={thoughtsResolved} childrenLength={childrenLength} allowSingleContext={false}/>
        )
      }
    </div>
  )
}

const ThoughtNewComponent = connect(mapStateToProps)(ThoughtContainer)

export default ThoughtNewComponent
