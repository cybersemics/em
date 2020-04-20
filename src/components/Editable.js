import React, { useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import he from 'he'
import classNames from 'classnames'
import globals from '../globals'
import { store } from '../store'
import { isMobile } from '../browser'
import { error } from '../action-creators/error'
import { throttle } from 'lodash'

// components
import ContentEditable from 'react-contenteditable'

// shortcuts
import { shortcutEmitter } from '../shortcuts'

// constants
import {
  EDIT_THROTTLE,
  EM_TOKEN,
  ROOT_TOKEN,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../constants'

import {
  tutorialNext,
} from '../action-creators/tutorial'

// action-creators
import { cursorBack } from '../action-creators/cursorBack'
import { setInvalidState } from '../action-creators/setInvalidState'
import { setEditingValue } from '../action-creators/setEditingValue'

// util
import {
  attribute,
  chain,
  contextOf,
  ellipsize,
  ellipsizeUrl,
  equalPath,
  getContexts,
  getSetting,
  getThought,
  hashContext,
  head,
  importText,
  isContextViewActive,
  isDivider,
  isElementHiddenByAutoFocus,
  isHTML,
  isURL,
  meta,
  pathToContext,
  setSelection,
  strip,
} from '../util'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

const stopPropagation = e => e.stopPropagation()

/*
  @contexts indicates that the thought is a context rendered as a child, and thus needs to be displayed as the context while maintaining the correct thoughts path
*/
// use rank instead of headRank(thoughtsRanked) as it will be different for context view
const Editable = ({ disabled, isEditing, thoughtsRanked, contextChain, cursorOffset, showContexts, rank, dispatch }) => {
  const thoughts = pathToContext(thoughtsRanked)
  const thoughtsResolved = contextChain.length ? chain(contextChain, thoughtsRanked) : thoughtsRanked
  const value = head(showContexts ? contextOf(thoughts) : thoughts) || ''
  const thoughtMeta = meta(thoughts)
  const readonly = thoughtMeta.readonly
  const uneditable = thoughtMeta.uneditable
  const context = showContexts && thoughts.length > 2 ? contextOf(contextOf(thoughts))
    : !showContexts && thoughts.length > 1 ? contextOf(thoughts)
    : [ROOT_TOKEN]
  const contextMeta = meta(context)
  const options = contextMeta.options ? Object.keys(contextMeta.options)
    .map(s => s.toLowerCase())
    : null
  const contextView = attribute(context, '=view')

  // store the old value so that we have a transcendental head when it is changed
  const oldValueRef = useRef(value)

  const thought = getThought(value)

  // store ContentEditable ref to update DOM without re-rendering the Editable during editing
  const contentRef = React.useRef()

  // toogle invalid-option class using contentRef
  const setContentInvalidState = value => contentRef.current.classList[value ? 'add' : 'remove']('invalid-option')

  /** Set or reset invalid state */
  const invalidStateError = invalidValue => {
    const isInvalid = invalidValue != null
    error(isInvalid ? `Invalid Value: "${invalidValue}"` : null)
    setInvalidState(isInvalid)

    // the Editable cannot connect to state.invalidState, as it would re-render during editing
    // instead, we use setContentInvalidState to manipulate the DOM directly
    setContentInvalidState(isInvalid)
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

  // dispatches existingThoughtChange and has tutorial logic
  // debounced from onChangeHandler
  // since variables inside this function won't get updated between re-render so passing latest context, rank etc as params
  const thoughtChangeHandler = (newValue, { context, showContexts, rank, thoughtsRanked, contextChain }) => {
    invalidStateError(null)

    const oldValue = oldValueRef.current
    // safari adds <br> to empty contenteditables after editing, so strip them out
    // make sure empty thoughts are truly empty
    if (contentRef.current && newValue.length === 0) {
      contentRef.current.innerHTML = newValue
    }

    const thought = getThought(oldValue)

    if (thought) {
      dispatch({ type: 'existingThoughtChange', context, showContexts, oldValue, newValue, rankInContext: rank, thoughtsRanked, contextChain })

      // rerender so that triple dash is converted into divider
      // otherwise nothing would be rerendered because the thought is still being edited
      if (isDivider(newValue)) {
        dispatch({ type: 'render' })

        // remove selection so that the focusOffset does not cause a split false positive in newThought
        document.getSelection().removeAllRanges()
      }

      // store the value so that we have a transcendental head when it is changed
      oldValueRef.current = newValue

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
  const throttledChangeRef = useRef(throttle(thoughtChangeHandler, EDIT_THROTTLE, { leading: false }))

  useEffect(() => {

    const { editing } = store.getState()

    // focus on the ContentEditable element if editing
    // NOTE: asyncFocus() needs to be called on mobile BEFORE the action that triggers the re-render is dispatched
    if (isEditing && contentRef.current && (!isMobile || editing)) {
      setSelection(contentRef.current, { offset: cursorOffset })
    }

    // flush pending edits when a shortcut is triggered
    const flush = () => throttledChangeRef.current.flush()
    shortcutEmitter.on('shortcut', flush)

    // flush edits and remove handler on unmount
    return () => {
      throttledChangeRef.current.flush()
      shortcutEmitter.off('shortcut', flush)
    }
  }, [isEditing, cursorOffset])

  // this handler does meta validation and calls thoughtChangeHandler immediately or using throttled reference
  const onChangeHandler = e => {
    // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
    const newValue = he.decode(strip(e.target.value, { preserveFormatting: true }))
    const oldValue = oldValueRef.current

    // TODO: Disable keypress
    // e.preventDefault() does not work
    // disabled={readonly} removes contenteditable property

    setEditingValue(newValue)

    if (newValue === oldValue) {
      if (readonly || uneditable || options) invalidStateError(null)

      // if we cancel the edit, we have to cancel pending its
      // this can occur for example by editing a value away from and back to its
      throttledChangeRef.current.cancel()

      return
    }

    const oldValueClean = oldValue === EM_TOKEN ? 'em' : ellipsize(oldValue)
    if (readonly) {
      error(`"${ellipsize(oldValueClean)}" is read-only and cannot be edited.`)
      throttledChangeRef.current.cancel() // see above
      return
    }
    else if (uneditable) {
      error(`"${ellipsize(oldValueClean)}" is uneditable.`)
      throttledChangeRef.current.cancel() // see above
      return
    }
    else if (options && !options.includes(newValue.toLowerCase())) {
      invalidStateError(newValue)
      throttledChangeRef.current.cancel() // see above
      return
    }

    const newNumContext = getContexts(newValue).length
    const isNewValueURL = isURL(newValue)

    const contextLengthChange = newNumContext > 0 || newNumContext !== getContexts(oldValueRef.current).length - 1
    const urlChange = isNewValueURL || isNewValueURL !== isURL(oldValueRef.current)

    // run the thoughtChangeHandler immediately if superscript changes or it's a url (also when it changes true to false)
    if (contextLengthChange || urlChange) {
      // update new supercript value and url boolean
      throttledChangeRef.current.flush()
      thoughtChangeHandler(newValue, { context, showContexts, rank, thoughtsRanked, contextChain })
    }
    else throttledChangeRef.current(newValue, { context, showContexts, rank, thoughtsRanked, contextChain })
  }

  const onPaste = e => {

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
      // pass the untrimmed old value to importText so that the whitespace is not loss when combining the existing value with the pasted value
      const rawDestValue = strip(contentRef.current.innerHTML, { preventTrim: true })
      importText(thoughtsRankedLive, isHTML(plainText)
        ? plainText
        : htmlText || plainText,
      { rawDestValue })
    }
  }

  const onBlur = () => {
    const { invalidState } = store.getState()
    throttledChangeRef.current.flush()

    // on blur remove error, remove invalid-option class, and reset editable html
    if (invalidState) {
      invalidStateError(null)
      contentRef.current.innerHTML = oldValueRef.current
    }

    // wait until the next render to determine if we have really blurred
    // otherwise editing may be incorrectly set to false when clicking on another thought from edit mode (which results in a blur and focus in quick succession)
    if (isMobile) {
      setTimeout(() => {
        if (!window.getSelection().focusNode) {
          dispatch({ type: 'editing', value: false })
        }
      })
    }
  }

  // prevented by mousedown event above for hidden thoughts
  const onFocus = e => {
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
  }

  // focus can only be prevented in mousedown event
  const onMouseDown = e => {
    // if editing is disabled, set the cursor since onFocus will not trigger
    if (disabled) {
      setCursorOnThought()
    }
    // disable focus on hidden thoughts
    else if (isElementHiddenByAutoFocus(e.target)) {
      e.preventDefault()
      store.dispatch(cursorBack())
    }

    // stop propagation to AppComponent which would otherwise call cursorBack
    e.stopPropagation()
  }

  const onTouchEnd = e => {
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
  }

  return <ContentEditable
    disabled={disabled}
    innerRef={contentRef}
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
    // stop propagation to prevent default content onClick (which removes the cursor)
    onClick={stopPropagation}
    onTouchEnd={onTouchEnd}
    onMouseDown={onMouseDown}
    onFocus={onFocus}
    onBlur={onBlur}
    onChange={onChangeHandler}
    onPaste={onPaste}
  />
}

export default connect()(Editable)
