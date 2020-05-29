import React, { useEffect, useRef } from 'react'
import { connect } from 'react-redux'
import he from 'he'
import classNames from 'classnames'
import globals from '../globals'
import { store } from '../store'
import { isMobile } from '../browser'
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

// action-creators
import {
  error,
  importText,
  setEditingValue,
  setInvalidState,
} from '../action-creators'

// util
import {
  addEmojiSpace,
  contextOf,
  ellipsize,
  ellipsizeUrl,
  equalPath,
  hashContext,
  head,
  isDivider,
  isElementHiddenByAutoFocus,
  isHTML,
  isURL,
  pathToContext,
  setSelection,
  strip,
} from '../util'

// selectors
import {
  attributeEquals,
  chain,
  getContexts,
  getSetting,
  getStyle,
  getThought,
  isContextViewActive,
  meta,
} from '../selectors'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

// eslint-disable-next-line jsdoc/require-jsdoc
const stopPropagation = e => e.stopPropagation()

/**
 * An editable thought with throttled editing.
 * Use rank instead of headRank(thoughtsRanked) as it will be different for context view.
 */
const Editable = ({ disabled, isEditing, thoughtsRanked, contextChain, cursorOffset, showContexts, rank, style, dispatch }) => {
  const state = store.getState()
  const thoughts = pathToContext(thoughtsRanked)
  const thoughtsResolved = contextChain.length ? chain(state, contextChain, thoughtsRanked) : thoughtsRanked
  const value = head(showContexts ? contextOf(thoughts) : thoughts) || ''
  const thoughtMeta = meta(state, thoughts)
  const readonly = thoughtMeta.readonly
  const uneditable = thoughtMeta.uneditable
  const context = showContexts && thoughts.length > 2 ? contextOf(contextOf(thoughts))
    : !showContexts && thoughts.length > 1 ? contextOf(thoughts)
    : [ROOT_TOKEN]
  const contextMeta = meta(state, context)
  const options = contextMeta.options ? Object.keys(contextMeta.options)
    .map(s => s.toLowerCase())
    : null
  const isTableColumn1 = attributeEquals(store.getState(), context, '=view', 'Table')

  // store the old value so that we have a transcendental head when it is changed
  const oldValueRef = useRef(value)

  const thought = getThought(state, value)

  // store ContentEditable ref to update DOM without re-rendering the Editable during editing
  const contentRef = React.useRef()

  // =style attribute on the thought itself
  const styleAttr = getStyle(state, thoughtsRanked)

  /** Toogle invalid-option class using contentRef. */
  const setContentInvalidState = value => contentRef.current.classList[value ? 'add' : 'remove']('invalid-option')

  /** Set or reset invalid state. */
  const invalidStateError = invalidValue => {
    const isInvalid = invalidValue != null
    store.dispatch(error(isInvalid ? `Invalid Value: "${invalidValue}"` : null))
    setInvalidState(isInvalid)

    // the Editable cannot connect to state.invalidState, as it would re-render during editing
    // instead, we use setContentInvalidState to manipulate the DOM directly
    setContentInvalidState(isInvalid)
  }

  /** Set the cursor on the thought. */
  const setCursorOnThought = ({ editing } = {}) => {

    const { cursorBeforeEdit, cursor } = store.getState() // use fresh state

    const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
    const thoughtsRankedLive = isEditing
      ? contextOf(thoughtsRanked).concat(head(showContexts ? contextOf(cursor) : cursor))
      : thoughtsRanked

    dispatch({
      type: 'setCursor',
      contextChain,
      cursorHistoryClear: true,
      editing,
      // set offset to null to prevent setSelection on next render
      // to use the existing offset after a user clicks or touches the screent
      // when cursor is changed through another method, such as cursorDown, offset will be reset
      offset: null,
      thoughtsRanked: thoughtsRankedLive,
    })
  }

  /**
   * Dispatches existingThoughtChange and has tutorial logic.
   * Debounced from onChangeHandler.
   * Since variables inside this function won't get updated between re-render so passing latest context, rank etc as params.
   */
  const thoughtChangeHandler = (newValue, { context, showContexts, rank, thoughtsRanked, contextChain }) => {
    invalidStateError(null)

    // make sure to get updated state
    const state = store.getState()

    const oldValue = oldValueRef.current
    // safari adds <br> to empty contenteditables after editing, so strip them out
    // make sure empty thoughts are truly empty
    if (contentRef.current && newValue.length === 0) {
      contentRef.current.innerHTML = newValue
    }

    const thought = getThought(state, oldValue)

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

      const tutorialChoice = +getSetting(state, 'Tutorial Choice') || 0
      const tutorialStep = +getSetting(state, 'Tutorial Step') || 1
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
        dispatch({ type: 'tutorialNext' })
      }
    }
  }

  // using useRef hook to store throttled function so that it can persist even between component re-renders, so that throttle.flush method can be used properly
  const throttledChangeRef = useRef(throttle(thoughtChangeHandler, EDIT_THROTTLE, { leading: false }))

  useEffect(() => {

    const { editing, noteFocus } = state

    // focus on the ContentEditable element if editing
    // if cursorOffset is null, do not setSelection to preserve click/touch offset, unless there is no browser selection
    // NOTE: asyncFocus() needs to be called on mobile BEFORE the action that triggers the re-render is dispatched
    if (isEditing && contentRef.current && (!isMobile || editing) && !noteFocus && (cursorOffset !== null || !window.getSelection().focusNode)) {
      setSelection(contentRef.current, { offset: cursorOffset })
    }

    /** Flushes pending edits. */
    const flush = () => throttledChangeRef.current.flush()
    shortcutEmitter.on('shortcut', flush)

    // flush edits and remove handler on unmount
    return () => {
      throttledChangeRef.current.flush()
      shortcutEmitter.off('shortcut', flush)
    }
  }, [isEditing, cursorOffset])

  /** Performs meta validation and calls thoughtChangeHandler immediately or using throttled reference. */
  const onChangeHandler = e => {

    // make sure to get updated state
    const state = store.getState()

    // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
    const newValue = addEmojiSpace(he.decode(strip(e.target.value, { preserveFormatting: true })))
    const oldValue = oldValueRef.current

    // TODO: Disable keypress
    // e.preventDefault() does not work
    // disabled={readonly} removes contenteditable property

    dispatch(setEditingValue(newValue))

    if (newValue === oldValue) {
      if (readonly || uneditable || options) invalidStateError(null)

      // if we cancel the edit, we have to cancel pending its
      // this can occur for example by editing a value away from and back to its
      throttledChangeRef.current.cancel()

      return
    }

    const oldValueClean = oldValue === EM_TOKEN ? 'em' : ellipsize(oldValue)
    if (readonly) {
      dispatch(error(`"${ellipsize(oldValueClean)}" is read-only and cannot be edited.`))
      throttledChangeRef.current.cancel() // see above
      return
    }
    else if (uneditable) {
      dispatch(error(`"${ellipsize(oldValueClean)}" is uneditable.`))
      throttledChangeRef.current.cancel() // see above
      return
    }
    else if (options && !options.includes(newValue.toLowerCase())) {
      invalidStateError(newValue)
      throttledChangeRef.current.cancel() // see above
      return
    }

    const newNumContext = getContexts(state, newValue).length
    const isNewValueURL = isURL(newValue)

    const contextLengthChange = newNumContext > 0 || newNumContext !== getContexts(state, oldValueRef.current).length - 1
    const urlChange = isNewValueURL || isNewValueURL !== isURL(oldValueRef.current)

    // run the thoughtChangeHandler immediately if superscript changes or it's a url (also when it changes true to false)
    if (contextLengthChange || urlChange) {
      // update new supercript value and url boolean
      throttledChangeRef.current.flush()
      thoughtChangeHandler(newValue, { context, showContexts, rank, thoughtsRanked, contextChain })
    }
    else throttledChangeRef.current(newValue, { context, showContexts, rank, thoughtsRanked, contextChain })
  }

  /** Imports text that is pasted onto the thought. */
  const onPaste = e => {

    const plainText = e.clipboardData.getData('text/plain')
    const htmlText = e.clipboardData.getData('text/html')

    // pasting from mobile copy (e.g. Choose "Share" in Twitter and select "Copy") results in blank plainText and htmlText
    // the text will still be pasted if we do not preventDefault, it just won't get stripped of html properly
    // See: https://github.com/cybersemics/em/issues/286
    if (plainText || htmlText) {
      e.preventDefault()
      throttledChangeRef.current.flush()

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
      dispatch(importText(thoughtsRankedLive, isHTML(plainText)
        ? plainText
        : htmlText || plainText,
      { rawDestValue })).then(({ newValue }) => {
        if (newValue) oldValueRef.current = newValue
      })
    }
  }

  /** Flushes edits and updates certain state variables on blur. */
  const onBlur = () => {
    const { invalidState } = state
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

  /**
   * Sets the cursor on focus.
   * Prevented by mousedown event above for hidden thoughts.
   */
  const onFocus = e => {

    // must get new state
    const state = store.getState()

    // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be. safe
    if (!state.dragInProgress) {

      // it is possible that the focus event fires with no onTouchEnd.
      // in this case, make sure it is not a valid attempt to enter edit mode.
      // we cannot assume all focus events without touchEnd events are false positives, because the user may have simply pressed tab/next field
      const falseFocus =
        // no cursor
        !state.cursor ||
        // clicking a different thought (when not editing)
        (!state.editing && !equalPath(thoughtsResolved, state.cursorBeforeEdit))

      setCursorOnThought({ editing: !falseFocus })

      // remove the selection caused by the falseFocus
      if (falseFocus) {
        document.activeElement.blur()
        document.getSelection().removeAllRanges()
      }
    }
  }

  /**
   * Sets the cursor on the thought when the mouse is clicked.
   * Focus can only be prevented in mousedown event.
   */
  const onMouseDown = e => {
    // if editing is disabled, set the cursor since onFocus will not trigger
    if (disabled) {
      setCursorOnThought()
    }
    // disable focus on hidden thoughts
    else if (isElementHiddenByAutoFocus(e.target)) {
      e.preventDefault()
      dispatch({ type: 'cursorBack' })
    }

    // stop propagation to AppComponent which would otherwise call cursorBack
    e.stopPropagation()
  }

  /** Sets the cursor on the thought when the touch event ends without a drag. */
  const onTouchEnd = e => {

    // make sure to get updated state
    const state = store.getState()

    showContexts = showContexts || isContextViewActive(state, thoughtsRanked)

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
    placeholder={isTableColumn1 ? ''
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
    style={{
      ...style, // style prop
      ...styleAttr, // style attribute
    }}
  />
}

export default connect()(Editable)
