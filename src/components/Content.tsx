import React, { FC, MouseEvent, useMemo, useRef } from 'react'
import { Dispatch } from 'redux'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isTouch } from '../browser'
import { cursorBack as cursorBackActionCreator, expandContextThought, modalRemindMeLater, toggleSidebar as toggleSidebarActionCreator } from '../action-creators'
import { MODAL_CLOSE_DURATION, ABSOLUTE_PATH, HOME_PATH, TUTORIAL2_STEP_SUCCESS } from '../constants'
import { attribute, getSetting, getAllChildren, isTutorial } from '../selectors'
import { isAbsolute, publishMode } from '../util'
import { State } from '../util/initialState'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'
import { childrenFilterPredicate } from '../selectors/getChildren'
import Editable from './Editable'
import { SimplePath } from '../types'

const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

const transientChildPath = [{
  value: '',
  rank: 0,
}] as SimplePath

/*
  Transient Editable represents a child that is yet not in the state.
  But as soon as user types it adds the child to the state with the new value and vanishes.
  However removing the transient editable should be handled by some business logic by parent components.
*/
const TransientEditable = <Editable
  transient={true}
  path={transientChildPath}
  simplePath={transientChildPath}
  rank={0}
/>

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { isLoading, noteFocus, search, showModal, rootContext } = state

  const isTutorialLocal = isLoading ? tutorialLocal : isTutorial(state)

  // @typescript-eslint/eslint-plugin does not yet support no-extra-parens with nullish coallescing operator
  // See: https://github.com/typescript-eslint/typescript-eslint/issues/1052
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  const tutorialStep = isLoading ? tutorialStepLocal : +(getSetting(state, 'Tutorial Step') ?? 1)

  const isAbsoluteContext = isAbsolute(rootContext)
  const children = getAllChildren(state, rootContext)

  const rankedRoot = isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH
  const rootThoughtsLength = children.filter(childrenFilterPredicate(state, rankedRoot, [], false)).length

  // pass rootSort to allow root Subthoughts ro render on toggleSort
  const rootSort = attribute(state, rootContext, '=sort') || 'None'

  return {
    search,
    showModal,
    isTutorialLocal,
    tutorialStep,
    rootThoughtsLength,
    noteFocus,
    rootSort,
    isAbsoluteContext,
    rootContext,
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: Dispatch<any>) => ({
  showRemindMeLaterModal: () => dispatch(modalRemindMeLater({ duration: MODAL_CLOSE_DURATION })),
  cursorBack: () => dispatch(cursorBackActionCreator()),
  toggleSidebar: () => dispatch(toggleSidebarActionCreator({})),
})

type ContentComponent = FC<ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>>

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
  const { search, isTutorialLocal, tutorialStep, showModal, showRemindMeLaterModal, cursorBack: moveCursorBack, toggleSidebar, rootThoughtsLength, noteFocus, rootSort, isAbsoluteContext } = props
  const contentRef = useRef<HTMLDivElement>(null)

  /** Removes the cursor if the click goes all the way through to the content. Extends cursorBack with logic for closing modals. */
  const clickOnEmptySpace = () => {
    // click event occured during text selection has focus node of type text unlike normal event which has node of type element
    // prevent text selection from calling cursorBack incorrectly
    const selection = window.getSelection()
    const focusNode = selection && selection.focusNode
    if (focusNode && focusNode.nodeType === Node.TEXT_NODE) return

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (showModal) {
      showRemindMeLaterModal()
    }
    else if (!noteFocus) {
      moveCursorBack()
      expandContextThought(null)
    }
  }

  /** Generate class names. */
  const contentClassNames = useMemo(() => classNames({
    content: true,
    'content-tutorial': isTouch && isTutorialLocal && tutorialStep !== TUTORIAL2_STEP_SUCCESS,
    publish: publishMode(),
  }), [tutorialStep, isTutorialLocal])

  return <div id='content-wrapper' onClick={e => {
    if (!showModal && isLeftSpaceClick(e, contentRef.current!)) {
      toggleSidebar()
    }
  }}>
    <div
      id='content'
      ref={contentRef}
      className={contentClassNames}
      onClick={clickOnEmptySpace}
    >
      {search != null
        ? <Search />
        : <React.Fragment>
          {rootThoughtsLength === 0 ?
            isAbsoluteContext ? TransientEditable : <NewThoughtInstructions childrenLength={rootThoughtsLength} isTutorial={isTutorialLocal} /> : <Subthoughts
              simplePath={isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH}
              expandable={true}
              sort={rootSort}
            />}
        </React.Fragment>
      }
    </div>
  </div>
}

export default connect(mapStateToProps, mapDispatchToProps)(Content)
