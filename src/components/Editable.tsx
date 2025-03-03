import _ from 'lodash'
import React, { FocusEventHandler, useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { cx } from '../../styled-system/css'
import { editableRecipe, invalidOptionRecipe, multilineRecipe } from '../../styled-system/recipes'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import TutorialChoice from '../@types/TutorialChoice'
import { cursorClearedActionCreator as cursorCleared } from '../actions/cursorCleared'
import { editThoughtActionCreator as editThought } from '../actions/editThought'
import { editingActionCreator as editingAction } from '../actions/editing'
import { errorActionCreator as error } from '../actions/error'
import importData from '../actions/importData'
import { importSpeechToTextActionCreator as importSpeechToText } from '../actions/importSpeechToText'
import { setInvalidStateActionCreator as setInvalidState } from '../actions/invalidState'
import { newThoughtActionCreator as newThought } from '../actions/newThought'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { toggleColorPickerActionCreator as toggleColorPicker } from '../actions/toggleColorPicker'
import { toggleLetterCaseActionCreator as toggleLetterCase } from '../actions/toggleLetterCase'
import { tutorialNextActionCreator as tutorialNext } from '../actions/tutorialNext'
import { isMac, isTouch } from '../browser'
import { commandEmitter } from '../commands'
import {
  EDIT_THROTTLE,
  EM_TOKEN,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../constants'
import preventAutoscroll, { preventAutoscrollEnd } from '../device/preventAutoscroll'
import * as selection from '../device/selection'
import globals from '../globals'
import findDescendant from '../selectors/findDescendant'
import { anyChild, getAllChildrenAsThoughts } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getSetting from '../selectors/getSetting'
import getThoughtById from '../selectors/getThoughtById'
import hasMulticursorSelector from '../selectors/hasMulticursor'
import rootedParentOf from '../selectors/rootedParentOf'
import store from '../stores/app'
import editingValueStore from '../stores/editingValue'
import editingValueUntrimmedStore from '../stores/editingValueUntrimmed'
import storageModel from '../stores/storageModel'
import suppressFocusStore from '../stores/suppressFocus'
import addEmojiSpace from '../util/addEmojiSpace'
import containsURL from '../util/containsURL'
import ellipsize from '../util/ellipsize'
import equalPath from '../util/equalPath'
import haptics from '../util/haptics'
import head from '../util/head'
import isDivider from '../util/isDivider'
import strip from '../util/strip'
import stripEmptyFormattingTags from '../util/stripEmptyFormattingTags'
import trimHtml from '../util/trimHtml'
import ContentEditable, { ContentEditableEvent } from './ContentEditable'
import useEditMode from './Editable/useEditMode'
import useOnCopy from './Editable/useOnCopy'
import useOnCut from './Editable/useOnCut'
import useOnPaste from './Editable/useOnPaste'

interface EditableProps {
  editableRef?: React.RefObject<HTMLInputElement>
  path: Path
  disabled?: boolean
  isEditing?: boolean
  isVisible?: boolean
  multiline?: boolean
  placeholder?: string
  rank?: number
  style?: React.CSSProperties
  className?: string
  simplePath: SimplePath
  /* If transient is true:
    1. Instead of calling exisitingThoughtChange, it calls newThought to add the given child to the state.
    2. It also sets focus to itself on render.
  */
  transient?: boolean
  onEdit?: (args: { path: Path; oldValue: string; newValue: string }) => void
}

// track if a thought is blurring so that we can avoid an extra dispatch of setEditingValue in onFocus
// otherwise it can trigger unnecessary re-renders
// intended to be global, not local state
let blurring = false

// this flag is used to ensure that the browser selection is not restored after the initial setCursorOnThought
let cursorOffsetInitialized = false

/**
 * An editable thought with throttled editing.
 * Use rank instead of headRank(simplePath) as it will be different for context view.
 */
const Editable = ({
  disabled,
  editableRef,
  isEditing,
  isVisible,
  multiline,
  placeholder,
  onEdit,
  path,
  simplePath,
  style,
  className,
  transient,
}: EditableProps) => {
  const state = store.getState()
  const dispatch = useDispatch()
  const thoughtId = head(simplePath)
  const parentId = head(rootedParentOf(state, simplePath))
  const readonly = findDescendant(state, thoughtId, '=readonly')
  const uneditable = findDescendant(state, thoughtId, '=uneditable')
  const optionsId = findDescendant(state, parentId, '=options')
  const childrenOptions = getAllChildrenAsThoughts(state, optionsId)
  const options = childrenOptions.length > 0 ? childrenOptions.map(thought => thought.value.toLowerCase()) : null
  // it is possible that the thought is deleted and the Editable is re-rendered before it unmounts, so guard against undefined thought
  const value = useSelector(state => getThoughtById(state, head(simplePath))?.value || '')
  const rank = useSelector(state => getThoughtById(state, head(simplePath))?.rank || 0)
  const fontSize = useSelector(state => state.fontSize)
  const isCursorCleared = useSelector(state => !!isEditing && state.cursorCleared)
  const hasMulticursor = useSelector(hasMulticursorSelector)
  // store the old value so that we have a transcendental head when it is changed
  const oldValueRef = useRef(value)
  const nullRef = useRef<HTMLInputElement>(null)
  const contentRef = editableRef || nullRef

  /** Used to prevent edit mode from being incorrectly activated on long tap. The default browser behavior must be prevented if setCursorOnThought was just called. */
  // https://github.com/cybersemics/em/issues/1793
  const disableTapRef = useRef(false)

  // console.info('<Editable> ' + prettyPath(store.getState(), simplePath))
  // useWhyDidYouUpdate('<Editable> ' + prettyPath(state, simplePath), {
  //   cursorOffset,
  //   disabled,
  //   editing,
  //   isEditing,
  //   isVisible,
  //   onEdit,
  //   path,
  //   simplePath,
  //   style,
  //   transient,
  //   value,
  //   rank,
  //   fontSize,
  //   hasNoteFocus,
  //   isCursorCleared,
  // })

  const labelId = findDescendant(state, parentId, '=label')
  const childrenLabel = anyChild(state, labelId)

  if (contentRef.current) {
    contentRef.current.style.opacity = '1.0'
  }

  /** Toggle invalid-option class using contentRef. */
  const setContentInvalidState = (value: boolean) =>
    contentRef.current && contentRef.current.classList[value ? 'add' : 'remove'](invalidOptionRecipe())

  // side effect to set old value ref to head value from updated simplePath. Also update editing value, if it is different from current value.
  useEffect(
    () => {
      oldValueRef.current = value
      if (isEditing && selection.isThought() && editingValueStore.getState() !== value) {
        editingValueStore.update(value)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value],
  )

  /** Set or reset invalid state. */
  const invalidStateError = (invalidValue: string | null) => {
    const isInvalid = invalidValue != null
    store.dispatch(error({ value: isInvalid ? `Invalid Value: "${invalidValue}"` : null }))
    setInvalidState(isInvalid)

    // the Editable cannot connect to state.invalidState, as it would re-render during editing
    // instead, we use setContentInvalidState to manipulate the DOM directly
    setContentInvalidState(isInvalid)
  }

  /** Set the cursor on the thought. */
  const setCursorOnThought = useCallback(
    ({ editing }: { editing?: boolean } = {}) => {
      const { cursor, editing: editingMode } = store.getState() // use fresh state

      // do not set cursor if it is unchanged and we are not entering edit mode
      if ((!editing || editingMode) && equalPath(cursor, path)) return

      // set offset to null to allow the browser to set the position of the selection
      let offset = null

      // if running for the first time, restore the offset if the path matches the restored cursor
      if (!cursorOffsetInitialized) {
        const restored: { path: Path | null; offset: number | null } = storageModel.get('cursor')
        if (path && restored.offset && equalPath(restored.path, path)) {
          offset = restored.offset || null
        }
      }

      // Prevent the cursor offset from being restored after the initial setCursorOnThought.
      cursorOffsetInitialized = true

      dispatch(
        setCursor({
          cursorHistoryClear: true,
          preserveMulticursor: true,
          editing,
          offset,
          path,
        }),
      )
    },
    // When isEditing changes, we need to reset the cursor on the thought.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, isEditing, path],
  )

  /**
   * Dispatches editThought and has tutorial logic.
   * Debounced from onChangeHandler.
   * Since variables inside this function won't get updated between re-render so passing latest context, rank etc as params.
   */
  const thoughtChangeHandler = (newValue: string, { rank, simplePath }: { rank: number; simplePath: SimplePath }) => {
    // Note: Don't update innerHTML of contentEditable here. Since thoughtChangeHandler may be debounced, it may cause contentEditable to be out of sync.
    invalidStateError(null)

    // make sure to get updated state
    const state = store.getState()

    const oldValue = oldValueRef.current

    if (transient) {
      dispatch(
        newThought({
          at: rootedParentOf(state, path),
          value: newValue,
        }),
      )
      return
    }

    dispatch(
      editThought({
        oldValue,
        newValue,
        rankInContext: rank,
        path: simplePath,
      }),
    )

    if (isDivider(newValue)) {
      // remove selection so that the focusOffset does not cause a split false positive in newThought
      selection.clear()
    }

    // store the value so that we have a transcendental head when it is changed
    oldValueRef.current = newValue

    const tutorialChoice = +(getSetting(state, 'Tutorial Choice') || 0) as TutorialChoice
    const tutorialStep = +(getSetting(state, 'Tutorial Step') || 1)
    if (
      newValue &&
      ((Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_PARENT &&
        newValue.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
        (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_PARENT &&
          newValue.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) ||
        ((Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1 ||
          Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2) &&
          newValue.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())) &&
      newValue.length > 0
    ) {
      dispatch(tutorialNext({}))
    }

    onEdit?.({ path, oldValue, newValue })
  }

  // using useRef hook to store throttled function so that it can persist even between component re-renders, so that throttle.flush method can be used properly
  const throttledChangeRef = useRef(_.throttle(thoughtChangeHandler, EDIT_THROTTLE, { leading: false }))

  const allowDefaultSelection = useEditMode({ contentRef, isEditing, path, style, transient })

  useEffect(() => {
    /** Flushes pending edits. */
    const flush = () => throttledChangeRef.current.flush()
    commandEmitter.on('command', flush)

    // flush edits and remove handler on unmount
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      throttledChangeRef.current.flush()
      commandEmitter.off('command', flush)
    }
  }, [])

  useEffect(() => {
    // if there is a multicursor, blur the contentRef
    if (hasMulticursor && contentRef.current && contentRef.current === document.activeElement) {
      contentRef.current.blur()
    }
  }, [hasMulticursor, contentRef])

  /** Performs meta validation and calls thoughtChangeHandler immediately or using throttled reference. */
  const onChangeHandler = useCallback(
    (e: ContentEditableEvent) => {
      // make sure to get updated state
      const state = store.getState()

      // NOTE: When Subthought components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      const oldValue = oldValueRef.current

      // Using a clipboard app such as Paste for iOS or the built-in clipboard viewer on Android directly modifies the innerHTML and triggers an onChange event on the contenteditable.
      const isClipboardInsert = /<div>(?!<br>)/.test(e.target.value)

      if (isClipboardInsert) {
        // When inserting plain text, the clipboard app replaces newlines with divs. This results in a mixed format that looks like HTML, but it actually plain text with meaningful whitespace.
        // TODO: What happens when actual HTML is inserted from the clipboard app? It needs to be differentiated from plain text with divs.
        // TODO: Consider handling this in importData or textToHtml, as onChangeHandler should not contain import logic. Just need to make sure it does not introduce regressions.
        const text = e.target.value.slice(oldValue.length).replace(/<div>/g, '\n')
        dispatch(
          importData({
            path: simplePath,
            text,
            rawDestValue: strip(contentRef.current!.innerHTML, { preventTrim: true }),
            transient,
          }),
        )
        return
      }

      editingValueUntrimmedStore.update(e.target.value)

      const newValue = stripEmptyFormattingTags(addEmojiSpace(trimHtml(e.target.value)))

      /* The realtime editingValue must always be updated (and not short-circuited) since oldValueRef is throttled. Otherwise, editingValueStore becomes stale and heights are not recalculated in VirtualThought.

        e.g.

          1. user edits a -> aa
          2. throttledChangeRef is queued.
          3. editingValueStore is updated in realtime on the first edit.
          4. user edits aa -> a
          5. onChangeHandler short circuits since throttledChangeRef has not resolved and newValue === oldValue
          6. editingValueStore must be updated, otherwise it will retain the stale value aa
      */
      editingValueStore.update(newValue)

      // TODO: Disable keypress
      // e.preventDefault() does not work
      // disabled={readonly} removes contenteditable property

      if (newValue === oldValue) {
        if (contentRef.current) {
          contentRef.current.style.opacity = '1.0'
        }

        if (readonly || uneditable || options) invalidStateError(null)

        // if we cancel the edit, we have to cancel pending its
        // this can occur for example by editing a value away from and back to its
        throttledChangeRef.current.cancel()

        return
      }

      const oldValueClean = oldValue === EM_TOKEN ? 'em' : ellipsize(oldValue)

      if (contentRef.current) {
        contentRef.current.style.opacity = '1.0'
      }

      if (readonly) {
        dispatch(error({ value: `"${ellipsize(oldValueClean)}" is read-only and cannot be edited.` }))
        throttledChangeRef.current.cancel() // see above
        return
      } else if (uneditable) {
        dispatch(error({ value: `"${ellipsize(oldValueClean)}" is uneditable.` }))
        throttledChangeRef.current.cancel() // see above
        return
      } else if (options && !options.includes(newValue.toLowerCase())) {
        invalidStateError(newValue)
        throttledChangeRef.current.cancel() // see above
        return
      }

      const newNumContext = getContexts(state, newValue).length
      const isNewValueURL = containsURL(newValue)

      const contextLengthChange =
        newNumContext > 0 || newNumContext !== getContexts(state, oldValueRef.current).length - 1
      const urlChange = isNewValueURL || isNewValueURL !== containsURL(oldValueRef.current)

      const isEmpty = newValue.length === 0

      // Safari adds <br> to empty contenteditables after editing, so strip them out.
      // Make sure empty thoughts are truly empty.
      if (contentRef.current && isEmpty) {
        contentRef.current.innerHTML = newValue
      }

      // run the thoughtChangeHandler immediately if superscript changes or it's a url (also when it changes true to false)
      if (transient || contextLengthChange || urlChange || isEmpty || isDivider(newValue)) {
        // update new supercript value and url boolean
        throttledChangeRef.current.flush()
        thoughtChangeHandler(newValue, { rank, simplePath })
      } else throttledChangeRef.current(newValue, { rank, simplePath })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readonly, uneditable /* TODO: options */],
  )

  /** Imports text that is pasted onto the thought. */
  const onPaste = useOnPaste({ contentRef, simplePath, transient })
  const onCopy = useOnCopy({ thoughtId })
  const onCut = useOnCut()
  /** Flushes edits and updates certain state variables on blur. */
  const onBlur: FocusEventHandler<HTMLElement> = useCallback(
    e => {
      blurring = true

      const { invalidState } = state
      throttledChangeRef.current.flush()

      // update the ContentEditable if the new scrubbed value is different (i.e. stripped, space after emoji added, etc)
      // they may intentionally become out of sync during editing if the value is modified programmatically (such as trim) in order to avoid reseting the caret while the user is still editing
      // oldValueRef.current is the latest value since throttledChangeRef was just flushed
      if (contentRef.current?.innerHTML !== oldValueRef.current) {
        // remove the invalid state error, remove invalid-option class, and reset editable html
        if (invalidState) {
          invalidStateError(null)
        }
        contentRef.current!.innerHTML = oldValueRef.current
      }

      // if we know that the focus is changing to another editable or note then do not set editing to false
      // (does not work when clicking a bullet as it is set to null)
      const isRelatedTargetEditableOrNote =
        e.relatedTarget &&
        ((e.relatedTarget as Element).hasAttribute?.('data-editable') ||
          !!(e.relatedTarget as Element).querySelector('[aria-label="note-editable"]'))

      if (isRelatedTargetEditableOrNote) return

      // if related target is not editable wait until the next render to determine if we have really blurred
      // otherwise editing may be incorrectly set to false when clicking on another thought from edit mode (which results in a blur and focus in quick succession)
      setTimeout(() => {
        // detect speech-to-text
        // needs to be deferred to the next tick, otherwise causes store.getState() to be invoked in a reducer (???)
        if (value.split(/<div>/g).length > 1) {
          dispatch(importSpeechToText({ simplePath, value: (e.target as HTMLInputElement).value }))
        }

        if (blurring) {
          blurring = false
          // reset editingValue on mobile if we have really blurred to avoid a spurious duplicate thought error (#895)
          // if enabled on desktop, it will break "clicking a bullet, the caret should move to the beginning of the thought" test)
          if (isTouch) {
            editingValueStore.update(null)
          }
          // temporary states such as duplicate error states and cursorCleared are reset on blur
          dispatch(cursorCleared({ value: false }))
        }

        if (isTouch) {
          // Set editing to false if user exits editing mode by tapping on a non-editable element.
          if (!selection.isThought()) {
            dispatch(editingAction({ value: false }))
          }
        }
      })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [simplePath],
  )

  /**
   * Sets the cursor on focus.
   * Prevented by mousedown event above for hidden thoughts.
   */
  const onFocus = useCallback(
    () => {
      preventAutoscrollEnd(contentRef.current)
      if (suppressFocusStore.getState()) return
      // do not allow blur to setEditingValue when it is followed immediately by a focus
      blurring = false

      // Update editingValueUntrimmedStore with the current value
      editingValueUntrimmedStore.update(value)

      const { dragHold, dragInProgress } = store.getState()
      if (!dragHold && !dragInProgress) {
        setCursorOnThought({ editing: true })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value, setCursorOnThought],
  )

  /** Sets the cursor on the thought on mousedown or tap. Handles hidden elements, drags, and editing mode. */
  const onTap = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Avoid triggering haptics twice since this handler is used for both onClick and onMouseDown.
      if (e.type !== 'mousedown') {
        haptics.light()
      }

      // If CMD/CTRL is pressed, don't focus the editable.
      const isMultiselectClick = isMac ? e.metaKey : e.ctrlKey
      if (isMultiselectClick) {
        e.preventDefault()
        return
      }

      // stop propagation to prevent clickOnEmptySpace onClick handler in Content component
      if (e.nativeEvent instanceof MouseEvent) {
        e.stopPropagation()

        // preventDefault after setCursorOnThought to avoid activating edit mode.
        // onMouseDown is the only place that the browser selection can be prevented on tap.
        if (disableTapRef.current) {
          e.preventDefault()

          // after the default browser behavior has been prevented, we can safely reset disableTapRef
          disableTapRef.current = false
        }
      }
      // when the MultiGesture is below the gesture threshold it is possible that onTap and onMouseDown are both triggered
      // in this case, we need to prevent onTap from being called a second time via onMouseDown
      // https://github.com/cybersemics/em/issues/1268
      else if (globals.touching && e.cancelable) {
        e.preventDefault()
      }

      const state = store.getState()

      const editingOrOnCursor = state.editing || equalPath(path, state.cursor)

      if (
        // disable editing when multicursor is enabled
        hasMulticursorSelector(state) ||
        disabled ||
        // do not set cursor on hidden thought
        // dragInProgress: not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
        (!globals.touching && !state.dragInProgress && !state.dragHold && (!editingOrOnCursor || !isVisible))
      ) {
        e.preventDefault()

        if (!isVisible) {
          selection.clear()

          if (state.showColorPicker) dispatch(toggleColorPicker({ value: false }))

          if (state.showLetterCase) dispatch(toggleLetterCase({ value: false }))
        } else {
          setCursorOnThought()

          // When the the cursor is first set on a thought, prevent the default browser behavior to avoid activating edit mode.
          // Do not reset until the long tap is definitely over.
          disableTapRef.current = true
          setTimeout(() => {
            disableTapRef.current = false
          }, 400)
        }
      } else {
        // for some reason doesn't work ontouchend
        if (editingOrOnCursor && e.type === 'mousedown' && isTouch) {
          preventAutoscroll(contentRef.current, {
            // about the height of a single-line thought
            bottomMargin: fontSize * 2,
          })
        }

        // We need to check if the user clicked the thought to not set the caret programmatically, because the caret will is set to the exact position of the tap by browser. See: #981.
        allowDefaultSelection()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, isVisible, path, setCursorOnThought],
  )

  return (
    <ContentEditable
      disabled={disabled}
      innerRef={contentRef}
      aria-label={'editable-' + head(path)}
      data-editable
      className={cx(multiline ? multilineRecipe() : null, editableRecipe(), className)}
      html={
        value === EM_TOKEN
          ? '<b>em</b>'
          : // render as empty string during temporary clear state
            // see: /actions/cursorCleared
            isCursorCleared
            ? ''
            : isEditing
              ? value
              : childrenLabel
                ? childrenLabel.value
                : value
      }
      placeholder={placeholder}
      // stop propagation to prevent default content onClick (which removes the cursor)
      onClick={onTap}
      // must call onMouseDown on mobile since onTap cannot preventDefault
      // otherwise gestures and scrolling can trigger cursorBack (#1054)
      onMouseDown={onTap}
      onFocus={onFocus}
      onBlur={onBlur}
      onChange={onChangeHandler}
      onCopy={onCopy}
      onCut={e => {
        // flush the last edit, otherwise if cut occurs in quick succession the new value can be overwritten by the throttled change
        throttledChangeRef.current?.flush()

        onCut(e)
      }}
      onPaste={e => {
        // flush the last edit, otherwise if paste occurs in quick succession the pasted value can be overwritten by the throttled change
        throttledChangeRef.current?.flush()

        onPaste(e)
      }}
      // iOS Safari delays event handling in case the DOM is modified during setTimeout inside an event handler,
      // unless it is given a hint that the element is some sort of form control
      role='button'
      style={style}
    />
  )
}

const EditableMemo = React.memo(Editable)
EditableMemo.displayName = 'Editable'

export default EditableMemo
