import React, { Dispatch, MouseEvent, useMemo, useRef } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { isMobile } from '../browser'
import expandContextThought from '../action-creators/expandContextThought'
import { EM_TOKEN, MODAL_CLOSE_DURATION, RANKED_ROOT, ROOT_TOKEN, TUTORIAL2_STEP_SUCCESS } from '../constants'
import { getSetting, getThoughts, hasChild, isChildVisible } from '../selectors'
import { publishMode } from '../util'
import { State } from '../util/initialState'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'

interface ContentDispatchToProps {
  cursorBack: () => void,
  showRemindMeLaterModal: () => void,
  toggleSidebar: () => void,
}

interface ContentProps {
  isTutorial?: boolean,
  noteFocus?: boolean,
  rootThoughtsLength: number,
  search?: string | null,
  showModal?: string | null,
  tutorialStep?: number,
}

const tutorialLocal = localStorage['Settings/Tutorial'] === 'On'
const tutorialStepLocal = +(localStorage['Settings/Tutorial Step'] || 1)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { focus, isLoading, noteFocus, search, showModal, showHiddenThoughts } = state
  const isTutorial = isLoading ? tutorialLocal : hasChild(state, [EM_TOKEN, 'Settings', 'Tutorial'], 'On')

  // @typescript-eslint/eslint-plugin does not yet support no-extra-parens with nullish coallescing operator
  // See: https://github.com/typescript-eslint/typescript-eslint/issues/1052
  // eslint-disable-next-line @typescript-eslint/no-extra-parens
  const tutorialStep = isLoading ? tutorialStepLocal : +(getSetting(state, 'Tutorial Step') ?? 1)

  // do no sort here as the new object reference would cause a re-render even when the children have not changed
  const rootThoughtsLength = (showHiddenThoughts ? getThoughts(state, [ROOT_TOKEN]) : getThoughts(state, [ROOT_TOKEN]).filter(({ value, rank }) => isChildVisible(state, [value], { value, rank }))).length

  return {
    focus,
    search,
    showModal,
    isTutorial,
    tutorialStep,
    rootThoughtsLength,
    noteFocus
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapDispatchToProps = (dispatch: Dispatch<any>): ContentDispatchToProps => ({
  showRemindMeLaterModal: () => dispatch({ type: 'modalRemindMeLater', duration: MODAL_CLOSE_DURATION }),
  cursorBack: () => dispatch({ type: 'cursorBack' }),
  toggleSidebar: () => dispatch({ type: 'toggleSidebar' })
})

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
const Content = (props: ContentProps & ContentDispatchToProps) => {
  const { search, isTutorial, tutorialStep, showModal, showRemindMeLaterModal, cursorBack: moveCursorBack, toggleSidebar, rootThoughtsLength, noteFocus } = props
  const contentRef = useRef()

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
    'content-tutorial': isMobile && isTutorial && tutorialStep !== TUTORIAL2_STEP_SUCCESS,
    publish: publishMode(),
  }), [tutorialStep, isTutorial])

  return <div id='content-wrapper' onClick={e => {
    if (!showModal && isLeftSpaceClick(e, contentRef.current)) {
      toggleSidebar()
    }
  }}>
    <div
      id='content'
      // @ts-ignore
      ref={contentRef}
      className={contentClassNames}
      onClick={clickOnEmptySpace}
    >
      {search != null
        ? <Search />
        : <React.Fragment>
          {rootThoughtsLength === 0 ? <NewThoughtInstructions childrenLength={rootThoughtsLength} /> : <Subthoughts
            thoughtsRanked={RANKED_ROOT}
            expandable={true}
          />}
        </React.Fragment>
      }
    </div>
  </div>
}

export default connect(mapStateToProps, mapDispatchToProps)(Content)
