import React, { FC, MouseEvent, useMemo, useRef, useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import classNames from 'classnames'
import { isTouch } from '../browser'
import {
  cursorBack as cursorBackActionCreator,
  expandContextThought,
  toggleSidebar as toggleSidebarActionCreator,
  closeModal,
} from '../action-creators'
import { ABSOLUTE_PATH, HOME_PATH, TUTORIAL2_STEP_SUCCESS } from '../constants'
import { getSetting, isTutorial, getSortPreference } from '../selectors'
import { isAbsolute, publishMode } from '../util'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'
import { childrenFilterPredicate, getAllChildrenAsThoughts } from '../selectors/getChildren'
import Editable from './Editable'
import { SimplePath, State } from '../@types'
import { storage } from '../util/storage'

const tutorialLocal = storage.getItem('Settings/Tutorial') === 'On'
const tutorialStepLocal = +(storage.getItem('Settings/Tutorial Step') || 1)

const transientChildPath = ['TRANSIENT_THOUGHT_ID'] as SimplePath

/*
  Transient Editable represents a child that is yet not in the state.
  But as soon as user types it adds the child to the state with the new value and vanishes.
  However removing the transient editable should be handled by some business logic by parent components.
*/
const TransientEditable = (
  <Editable transient={true} path={transientChildPath} simplePath={transientChildPath} rank={0} />
)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { isLoading, noteFocus, search, showModal, rootContext } = state

  const isTutorialLocal = isLoading ? tutorialLocal : isTutorial(state)

  const tutorialStep = isLoading ? tutorialStepLocal : +(getSetting(state, 'Tutorial Step') ?? 1)

  const isAbsoluteContext = isAbsolute(rootContext)
  const children = getAllChildrenAsThoughts(state, rootContext)

  const rankedRoot = isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH
  const rootThoughtsLength = children.filter(childrenFilterPredicate(state, rankedRoot)).length

  // pass rootSort to allow root Subthoughts to render on toggleSort
  // pass scalar components to avoid re-render from object reference change
  const { type: rootSortType, direction: rootSortDirection } = getSortPreference(state, rootContext)

  return {
    search,
    showModal,
    isTutorialLocal,
    tutorialStep,
    rootThoughtsLength,
    noteFocus,
    rootSortDirection,
    rootSortType,
    isAbsoluteContext,
    rootContext,
  }
}

type ContentComponent = FC<ReturnType<typeof mapStateToProps>>

/**
 * Calculates whether there was a click on the left margin or padding zone of content element.
 *
 * @param e The onClick e object.
 * @param content HTML element.
 */
const isLeftSpaceClick = (e: MouseEvent, content?: HTMLElement) => {
  const style = window.getComputedStyle(content!)
  const pTop = parseInt(style.getPropertyValue('padding-top'))
  const mTop = parseInt(style.getPropertyValue('margin-top'))
  const mLeft = parseInt(style.getPropertyValue('margin-left'))
  const x = e.clientX
  const y = e.clientY
  return x < mLeft && y > pTop + mTop
}

/** The main content section of em. */
const Content: ContentComponent = props => {
  const {
    search,
    isTutorialLocal,
    tutorialStep,
    showModal,
    rootThoughtsLength,
    noteFocus,
    rootSortDirection,
    rootSortType,
    isAbsoluteContext,
  } = props
  const dispatch = useDispatch()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isPressed, setIsPressed] = useState<boolean>(false)

  /** Removes the cursor if the click goes all the way through to the content. Extends cursorBack with logic for closing modals. */
  const clickOnEmptySpace = () => {
    // make sure the the actual Content element has been clicked
    // otherwise it will incorrectly be called on mobile due to touch vs click ordering (#1029)
    if (!isPressed) return
    setIsPressed(false)

    // click event occured during text selection has focus node of type text unlike normal event which has node of type element
    // prevent text selection from calling cursorBack incorrectly
    const selection = window.getSelection()
    const focusNode = selection && selection.focusNode
    if (focusNode && focusNode.nodeType === Node.TEXT_NODE) return

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (showModal) {
      dispatch(closeModal())
    } else if (!noteFocus) {
      dispatch(cursorBackActionCreator())
      expandContextThought(null)
    }
  }

  /** Generate class names. */
  const contentClassNames = useMemo(
    () =>
      classNames({
        content: true,
        'content-tutorial': isTouch && isTutorialLocal && tutorialStep !== TUTORIAL2_STEP_SUCCESS,
        publish: publishMode(),
      }),
    [tutorialStep, isTutorialLocal],
  )

  return (
    <div
      id='content-wrapper'
      onClick={e => {
        if (!showModal && isLeftSpaceClick(e, contentRef.current!)) {
          dispatch(toggleSidebarActionCreator({}))
        }
      }}
    >
      <div
        id='content'
        ref={contentRef}
        className={contentClassNames}
        onClick={clickOnEmptySpace}
        onMouseDown={() => setIsPressed(true)}
      >
        {search != null ? (
          <Search />
        ) : (
          <>
            {rootThoughtsLength === 0 ? (
              isAbsoluteContext ? (
                TransientEditable
              ) : (
                <NewThoughtInstructions childrenLength={rootThoughtsLength} isTutorial={isTutorialLocal} />
              )
            ) : (
              <Subthoughts
                simplePath={isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH}
                expandable={true}
                sortDirection={rootSortDirection}
                sortType={rootSortType}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default connect(mapStateToProps)(Content)
