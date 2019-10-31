import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import globals from '../globals.js'
import { store } from '../store.js'
import { isMobile } from '../browser.js'

// components
import ContentEditable from 'react-contenteditable'

// constants
import {
  HELPER_NEWCHILD_DELAY,
  ROOT_TOKEN,
  TUTORIAL_SAMPLE_CONTEXT,
  TUTORIAL2_STEP_CREATE,
  TUTORIAL2_STEP_SUBTHOUGHT,
  TUTORIAL2_STEP_DUPLICATE_THOUGHT,
  TUTORIAL2_STEP_MULTIPLE_CONTEXTS,
} from '../constants.js'

import {
  tutorialNext,
} from '../action-creators/tutorial.js'

// util
import {
  chain,
  cursorBack,
  encodeItems,
  equalItemsRanked,
  importText,
  intersections,
  isContextViewActive,
  isElementHiddenByAutoFocus,
  signifier,
  strip,
  unrank,
} from '../util.js'

// the amount of time in milliseconds since lastUpdated before the thought placeholder changes to something more facetious
const EMPTY_THOUGHT_TIMEOUT = 5 * 1000

/*
  @contexts indicates that the item is a context rendered as a child, and thus needs to be displayed as the context while maintaining the correct items path
*/
// use rank instead of sigRank(itemsRanked) as it will be different for context view
export const Editable = connect()(({ focus, itemsRanked, contextChain, showContexts, rank, dispatch }) => {
  const items = unrank(itemsRanked)
  const itemsResolved = contextChain.length ? chain(contextChain, itemsRanked) : itemsRanked
  const value = signifier(showContexts ? intersections(items) : items) || ''
  const ref = React.createRef()
  const context = showContexts && items.length > 2 ? intersections(intersections(items))
    : !showContexts && items.length > 1 ? intersections(items)
    : [ROOT_TOKEN]

  // store the old value so that we have a transcendental signifier when it is changed
  let oldValue = value

  const item = store.getState().data[value]

  if (!item) {
    console.warn(`Editable: Could not find item data for "${value} in ${JSON.stringify(unrank(intersections(itemsRanked)))}.`)
    // Mitigration strategy (incomplete)
    // store.dispatch({
    //   type: 'existingItemDelete',
    //   itemsRanked,
    //   rank: sigRank(itemsRanked)
    // })
    return null
  }

  const setCursorOnItem = ({ editing } = {}) => {

    // delay until after the render
    if (!globals.disableOnFocus) {
      const { cursorBeforeEdit, cursor } = store.getState()

      globals.disableOnFocus = true
      setTimeout(() => {
        globals.disableOnFocus = false
      }, 0)

      const isEditing = equalItemsRanked(cursorBeforeEdit, itemsResolved)
      const itemsRankedLive = isEditing
        ? intersections(itemsRanked).concat(signifier(showContexts ? intersections(cursor) : cursor))
        : itemsRanked

      dispatch({ type: 'setCursor', itemsRanked: itemsRankedLive, contextChain, cursorHistoryClear: true, editing })
    }
    else if (editing) {
      dispatch({ type: 'editing', value: true })
    }
  }

  // add identifiable className for restoreSelection
  return <ContentEditable
    className={classNames({
      editable: true,
      ['editable-' + encodeItems(unrank(itemsResolved), rank)]: true,
      empty: value.length === 0
    })}
    // trim so that trailing whitespace doesn't cause it to wrap
    html={item.animateCharsVisible != null ? value.slice(0, item.animateCharsVisible).trim() : value}
    placeholder={new Date() - new Date(item.lastUpdated) > EMPTY_THOUGHT_TIMEOUT ? 'Hmmm... I\'ve gone blank' : 'Add a thought'}
    onClick={e => {
      // stop propagation to prevent default content onClick (which removes the cursor)
      e.stopPropagation()
    }}
    onTouchEnd={e => {
      const state = store.getState()

      showContexts = showContexts || isContextViewActive(unrank(itemsRanked), { state })

      if (
        !globals.touching &&
        // not sure if this can happen, but I observed some glitchy behavior with the cursor moving when a drag and drop is completed so check dragInProgress to be safe
        !state.dragInProgress &&
        !isElementHiddenByAutoFocus(e.target) &&
        (
          // no cursor
          !state.cursor ||
          // clicking a different item (when not editing)
          (!state.editing && !equalItemsRanked(itemsResolved, state.cursorBeforeEdit))
        )) {

        // prevent focus to allow navigation with mobile keyboard down
        e.preventDefault()
        setCursorOnItem()
      }
    }}
    // focus can only be prevented in mousedown event
    onMouseDown={e => {
      // disable focus on hidden items
      if(isElementHiddenByAutoFocus(e.target)) {
        e.preventDefault()
        cursorBack()
      }
    }}
    // prevented by mousedown event above for hidden items
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
          // clicking a different item (when not editing)
          (!state.editing && !equalItemsRanked(itemsResolved, state.cursorBeforeEdit))
        )

        setCursorOnItem({ editing: !falseFocus })

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

      // NOTE: When Child components are re-rendered on edit, change is called with identical old and new values (?) causing an infinite loop
      const newValue = strip(e.target.value)

      // safari adds <br> to empty contenteditables after editing, so strip thnem out
      // make sure empty items are truly empty
      if (ref.current && newValue.length === 0) {
        ref.current.innerHTML = newValue
      }

      if (newValue !== oldValue) {
        const item = state.data[oldValue]
        if (item) {
          dispatch({ type: 'existingItemChange', context, showContexts, oldValue, newValue, rankInContext: rank, itemsRanked, contextChain })

          // store the value so that we have a transcendental signifier when it is changed
          oldValue = newValue

          const tutorialStep = state.settings.tutorialStep
          if (newValue && (
            (
              newValue.toLowerCase().replace(/"/g, '') === TUTORIAL_SAMPLE_CONTEXT.toLowerCase() && (
                Math.floor(tutorialStep) === TUTORIAL2_STEP_CREATE ||
                Math.floor(tutorialStep) === TUTORIAL2_STEP_DUPLICATE_THOUGHT
              )
            ) || (
              signifier(context).toLowerCase().replace(/"/g, '') === TUTORIAL_SAMPLE_CONTEXT.toLowerCase() && (
                Math.floor(tutorialStep) === TUTORIAL2_STEP_SUBTHOUGHT ||
                Math.floor(tutorialStep) === TUTORIAL2_STEP_MULTIPLE_CONTEXTS
              )
            )
          )) {
            clearTimeout(globals.newChildHelperTimeout)
            globals.newChildHelperTimeout = setTimeout(tutorialNext, newValue.toLowerCase().replace(/"/g, '') === TUTORIAL_SAMPLE_CONTEXT.toLowerCase() ? 0 : HELPER_NEWCHILD_DELAY)
          }

          // superscriptHelperTimeout = setTimeout(() => {
          //   const data = store.getState().data
          //   // new item belongs to at least 2 contexts
          //   if (data[newValue].memberOf && data[newValue].memberOf.length >= 2) {
          //     dispatch({ type: 'showHelperIcon', id: 'superscript', data: {
          //       value: newValue,
          //       num: data[newValue].memberOf.length,
          //       itemsRanked
          //     }})
          //   }
          // }, HELPER_SUPERSCRIPT_DELAY)
        }
      }
    }}

    onPaste={e => {
      e.preventDefault()

      // the data will be available as text/plain or text/html
      // this reflects the format of the source data more than the actual contents
      // text/plain may contain text that ultimately looks like html (contains <li>) and should be parsed as html
      const plainText = e.clipboardData.getData('text/plain')
      const htmlText = e.clipboardData.getData('text/html')

      // import into the live items
      // neither ref.current is set here nor can newValue be stored from onChange
      // not sure exactly why, but it appears that the DOM node has been removed before the paste handler is called
      const editing = equalItemsRanked(store.getState().cursorBeforeEdit, itemsRanked)
      const itemsRankedLive = editing ? store.getState().cursor : itemsRanked

      importText(itemsRankedLive, htmlText || plainText)
    }}
  />
})

