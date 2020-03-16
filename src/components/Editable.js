import React, { useRef, useEffect } from 'react'
import { connect } from 'react-redux'
import he from 'he'
import classNames from 'classnames'
import globals from '../globals.js'
import { store } from '../store.js'
import { isMobile } from '../browser.js'
import _ from 'lodash'
import { error } from '../action-creators/error.js'

// components
import ContentEditable from 'react-contenteditable'

// shortcuts
import { ShortcutEmitter } from '../shortcuts'

// constants
import {
  EM_TOKEN,
  ROOT_TOKEN,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
  EDIT_THROTTLE
} from '../constants.js'

import {
  tutorialNext,
} from '../action-creators/tutorial.js'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'

// util
import {
  attribute,
  chain,
  contextOf,
  ellipsize,
  equalPath,
  getSetting,
  getThought,
  hashContext,
  head,
  importText,
  isContextViewActive,
  isDivider,
  isElementHiddenByAutoFocus,
  isHTML,
  pathToContext,
  strip,
  meta,
  ellipsizeUrl,
  isRoot,
  isEM,
} from '../util.js'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

/*
  @contexts indicates that the thought is a context rendered as a child, and thus needs to be displayed as the context while maintaining the correct thoughts path
*/
// use rank instead of headRank(thoughtsRanked) as it will be different for context view
export const Editable = connect()(({ isEditing, thoughtsRanked, contextChain, showContexts, rank, dispatch }) => {
  const thoughts = pathToContext(thoughtsRanked)
  const thoughtsResolved = contextChain.length ? chain(contextChain, thoughtsRanked) : thoughtsRanked
  const value = head(showContexts ? contextOf(thoughts) : thoughts) || ''
  const thoughtMeta = meta(thoughts)
  const readonly = thoughtMeta.readonly
  const uneditable = thoughtMeta.uneditable
  const ref = React.createRef()
  const context = showContexts && thoughts.length > 2 ? contextOf(contextOf(thoughts))
    : !showContexts && thoughts.length > 1 ? contextOf(thoughts)
      : [ROOT_TOKEN]
  const contextMeta = meta(context)
  const options = contextMeta.options ? Object.keys(contextMeta.options)
    .map(s => s.toLowerCase())
    : null
  const contextView = attribute(context, '=view')

  // store the old value so that we have a transcendental head when it is changed
  let oldValue = value // eslint-disable-line fp/no-let

  const thought = getThought(value)

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

  const onChangeHandler = e => {

    // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
    const newValue = he.decode(strip(e.target.value, { preserveFormatting: true }))

    // TODO: Disable keypress
    // e.preventDefault() does not work
    // disabled={readonly} removes contenteditable property to thought cannot be selected/navigated

    if (newValue === oldValue) {
      if (readonly || uneditable || options) {
        error(null)
      }
      return
    }

    const oldValueClean = oldValue === EM_TOKEN ? 'em' : ellipsize(oldValue)
    if (isEM(thoughts) || isRoot(thoughts)) {
      error(`The "${isEM(thoughts) ? 'em' : 'home'} context" cannot be edited.`)
      return
    }
    if (readonly) {
      error(`"${ellipsize(oldValueClean)}" is read-only and cannot be edited.`)
      return
    }
    else if (uneditable) {
      error(`"${ellipsize(oldValueClean)}" is uneditable.`)
      return
    }
    else if (options && !options.includes(newValue.toLowerCase())) {
      error(`Invalid Value: "${newValue}"`)
      return
    }

    // safari adds <br> to empty contenteditables after editing, so strip thnem out
    // make sure empty thoughts are truly empty
    if (ref.current && newValue.length === 0) {
      ref.current.innerHTML = newValue
    }

    const thought = getThought(oldValue)

    if (thought) {
      dispatch({ type: 'existingThoughtChange', context, showContexts, oldValue, newValue, rankInContext: rank, thoughtsRanked, contextChain })

      // rerender so that triple dash is converted into horizontal rule
      // otherwise nothing would be rerendered because the thought is still being edited
      if (isDivider(newValue)) {
        dispatch({ type: 'render' })
      }

      // store the value so that we have a transcendental head when it is changed
      oldValue = newValue

      const tutorialChoice = +getSetting('Tutorial Choice') || 0
      const tutorialStep = +getSetting('Tutorial Step') || 1
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

  // using useRef hook to store throttled function so that it can persist even between component re-renders, so that throttle.flush method can be used properly
  const throttledChangeRef = useRef(_.throttle(onChangeHandler, EDIT_THROTTLE, { leading: false }))
  ShortcutEmitter.on('shortcut', () => {
    throttledChangeRef.current.flush()
  })

  useEffect(() => throttledChangeRef.current.flush, []) // clean up function when component unmounts (flushing throttle change)

  // add identifiable className for restoreSelection
  return <ContentEditable
    className={classNames({
      editable: true,
      ['editable-' + hashContext(thoughtsResolved, rank)]: true,
      empty: value.length === 0
    })}
    html={value === EM_TOKEN ? '<b>em</b>'
      : isEditing ? value
        : thoughtMeta && thoughtMeta.label
          ? Object.keys(thoughtMeta.label)[0]
          : ellipsizeUrl(value)
    }
    placeholder={contextView === 'Table' ? ''
      : thought && new Date() - new Date(thought.lastUpdated) > EMPTY_THOUGHT_TIMEOUT ? 'This is an empty thought'
        : 'Add a thought'}
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
        store.dispatch(cursorBack())
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
      throttledChangeRef.current.flush() // flushing the throttle change when onblur
    }}
    onChange={throttledChangeRef.current}
    onPaste={e => {

      const plainText = e.clipboardData.getData('text/plain')
      const htmlText = e.clipboardData.getData('text/html')

      // pasting from mobile copy (e.g. Choose "Share" in Twitter and select "Copy") results in blank plainText and htmlText
      // the text will still be pasted if we do not preventDefault, it just won't get stripped of html properly
      // See: https://github.com/cybersemics/em/issues/286
      if (plainText || htmlText) {
        e.preventDefault()

        // import into the live thoughts
        // neither ref.current is set here nor can newValue be stored from onChange
        // not sure exactly why, but it appears that the DOM node has been removed before the paste handler is called
        const { cursor, cursorBeforeEdit } = store.getState()
        const thoughtsRankedLive = equalPath(cursorBeforeEdit, thoughtsRanked)
          ? cursor
          : thoughtsRanked

        // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
        importText(thoughtsRankedLive, isHTML(plainText)
          ? plainText
          : htmlText || plainText
        )
      }
    }}
  />
})
