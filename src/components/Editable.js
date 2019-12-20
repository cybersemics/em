import React from 'react'
import { connect } from 'react-redux'
import he from 'he'
import * as classNames from 'classnames'
import globals from '../globals.js'
import { store } from '../store.js'
import { isMobile } from '../browser.js'

// components
import ContentEditable from 'react-contenteditable'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
} from '../constants.js'

import {
  tutorialNext,
} from '../action-creators/tutorial.js'

// util
import {
  chain,
  cursorBack,
  hashContext,
  equalPath,
  getThought,
  importText,
  contextOf,
  isContextViewActive,
  isElementHiddenByAutoFocus,
  head,
  strip,
  pathToContext,
  isHTML,
} from '../util.js'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

/*
  @contexts indicates that the thought is a context rendered as a child, and thus needs to be displayed as the context while maintaining the correct thoughts path
*/
// use rank instead of headRank(thoughtsRanked) as it will be different for context view
export const Editable = connect()(({ focus, thoughtsRanked, contextChain, showContexts, rank, dispatch }) => {
  const thoughts = pathToContext(thoughtsRanked)
  const thoughtsResolved = contextChain.length ? chain(contextChain, thoughtsRanked) : thoughtsRanked
  const value = head(showContexts ? contextOf(thoughts) : thoughts) || ''
  const ref = React.createRef()
  const context = showContexts && thoughts.length > 2 ? contextOf(contextOf(thoughts))
    : !showContexts && thoughts.length > 1 ? contextOf(thoughts)
    : [ROOT_TOKEN]

  // store the old value so that we have a transcendental head when it is changed
  let oldValue = value // eslint-disable-line fp/no-let

  const thought = getThought(value)

  if (!thought) {
    console.warn(`Editable: Could not find thought for "${value} in ${JSON.stringify(pathToContext(contextOf(thoughtsRanked)))}.`)
    // Mitigration strategy (incomplete)
    // store.dispatch({
    //   type: 'existingThoughtDelete',
    //   thoughtsRanked,
    //   rank: headRank(thoughtsRanked)
    // })
    return null
  }

  const setCursorOnThought = ({ editing } = {}) => {

    // delay until after the render
    if (!globals.disableOnFocus) {
      const { cursorBeforeEdit, cursor } = store.getState()

      globals.disableOnFocus = true
      setTimeout(() => {
        globals.disableOnFocus = false
      }, 0)

      const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
      const thoughtsRankedLive = isEditing
        ? contextOf(thoughtsRanked).concat(head(showContexts ? contextOf(cursor) : cursor))
        : thoughtsRanked

      dispatch({ type: 'setCursor', thoughtsRanked: thoughtsRankedLive, contextChain, cursorHistoryClear: true, editing })
    }
    else if (editing) {
      dispatch({ type: 'editing', value: true })
    }
  }

  // add identifiable className for restoreSelection
  return <ContentEditable
    className={classNames({
      editable: true,
      ['editable-' + hashContext(thoughtsResolved, rank)]: true,
      empty: value.length === 0
    })}
    html={value}
    placeholder={new Date() - new Date(thought.lastUpdated) > EMPTY_THOUGHT_TIMEOUT ? 'This is an empty thought' : 'Add a thought'}
    onClick={e => {
      // stop propagation to prevent default content onClick (which removes the cursor)
      e.stopPropagation()
    }}
    onTouchEnd={e => {
      const state = store.getState()

      showContexts = showContexts || isContextViewActive(thoughtsRanked, { state })

      if (
        !globals.touching &&
        // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
        !state.dragInProgress &&
        !isElementHiddenByAutoFocus(e.target) &&
        (
          // no cursor
          !state.cursor ||
          // clicking a different thought (when not editing)
          (!state.editing && !equalPath(thoughtsResolved, state.cursorBeforeEdit))
        )) {

        // prevent focus to allow navigation with mobile keyboard down
        e.preventDefault()
        setCursorOnThought()
      }
    }}
    // focus can only be prevented in mousedown event
    onMouseDown={e => {
      // disable focus on hidden thoughts
      if (isElementHiddenByAutoFocus(e.target)) {
        e.preventDefault()
        cursorBack()
      }

      // stop propagation to AppComponent which would otherwise call cursorBack
      e.stopPropagation()
    }}
    // prevented by mousedown event above for hidden thoughts
    onFocus={e => {
      const state = store.getState()

      // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be. safe
      if (!state.dragInProgress) {

        // it is possible that the focus event fires with no onTouchEnd.
        // in this case, make sure it is not a valid attempt to enter edit mode.
        // we cannot assume all focus events without touchEnd events are false positives, because the user may have simply pressed tab/next field
        const falseFocus = (
          // no cursor
          !state.cursor ||
          // clicking a different thought (when not editing)
          (!state.editing && !equalPath(thoughtsResolved, state.cursorBeforeEdit))
        )

        setCursorOnThought({ editing: !falseFocus })

        // remove the selection caused by the falseFocus
        if (falseFocus) {
          document.activeElement.blur()
          document.getSelection().removeAllRanges()
        }
      }
    }}
    onBlur={() => {
      // wait until the next render to determine if we have really blurred
      // otherwise editing may be incorrectly set to false when clicking on another thought from edit mode (which results in a blur and focus in quick succession)
      if (isMobile) {
        setTimeout(() => {
          if (!window.getSelection().focusNode) {
            dispatch({ type: 'editing', value: false })
          }
        })
      }
    }}
    onChange={e => {

      const state = store.getState()

      // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      const newValue = he.decode(strip(e.target.value))

      // safari adds <br> to empty contenteditables after editing, so strip thnem out
      // make sure empty thoughts are truly empty
      if (ref.current && newValue.length === 0) {
        ref.current.innerHTML = newValue
      }

      if (newValue !== oldValue) {
        const thought = getThought(oldValue)
        if (thought) {
          dispatch({ type: 'existingThoughtChange', context, showContexts, oldValue, newValue, rankInContext: rank, thoughtsRanked, contextChain })

          // store the value so that we have a transcendental head when it is changed
          oldValue = newValue

          const { tutorialChoice, tutorialStep } = state.settings
          if (newValue && (
            (
              Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_PARENT &&
              newValue.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
            ) || (
              Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_PARENT &&
              newValue.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()
            ) || (
              (
                Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1 ||
                Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2
              ) &&
              newValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
            )
          )) {
            tutorialNext()
          }
        }
      }
    }}

    onPaste={e => {
      e.preventDefault()

      // the thoughtIndex will be available as text/plain or text/html
      // this reflects the format of the source thoughtIndex more than the actual contents
      // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
      const plainText = e.clipboardData.getData('text/plain')
      const htmlText = e.clipboardData.getData('text/html')

      // import into the live thoughts
      // neither ref.current is set here nor can newValue be stored from onChange
      // not sure exactly why, but it appears that the DOM node has been removed before the paste handler is called
      const editing = equalPath(store.getState().cursorBeforeEdit, thoughtsRanked)
      const thoughtsRankedLive = editing ? store.getState().cursor : thoughtsRanked

      isHTML(plainText)
        ? importText(thoughtsRankedLive, plainText)
        : importText(thoughtsRankedLive, htmlText || plainText)
    }}
  />
})
