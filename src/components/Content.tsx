import React, { FC, useRef, useState } from 'react'
import { connect, useDispatch } from 'react-redux'
import classNames from 'classnames'
import { isTouch } from '../browser'
import { cursorBack as cursorBackActionCreator, expandContextThought, closeModal } from '../action-creators'
import { ABSOLUTE_PATH, HOME_PATH, TUTORIAL2_STEP_SUCCESS } from '../constants'
import { getSetting, getAllChildren, isTutorial } from '../selectors'
import { isAbsolute, publishMode } from '../util'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'
import { childrenFilterPredicate } from '../selectors/getChildren'
import Editable from './Editable'
import { SimplePath, State } from '../@types'
import { storage } from '../util/storage'
import * as selection from '../device/selection'
import styled from 'styled-components'
import tw from 'twin.macro'

const tutorialLocal = storage.getItem('Settings/Tutorial') === 'On'
const tutorialStepLocal = +(storage.getItem('Settings/Tutorial Step') || 1)

const transientChildPath = [
  {
    value: '',
    rank: 0,
  },
] as SimplePath

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
  const children = getAllChildren(state, rootContext)

  const rankedRoot = isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH
  const rootThoughtsLength = children.filter(childrenFilterPredicate(state, rankedRoot, [], false)).length

  return {
    search,
    showModal,
    isTutorialLocal,
    tutorialStep,
    rootThoughtsLength,
    noteFocus,
    isAbsoluteContext,
    rootContext,
  }
}

type ContentComponent = FC<ReturnType<typeof mapStateToProps>>

/** The main content section of em. */
const Content: ContentComponent = props => {
  const { search, isTutorialLocal, tutorialStep, showModal, rootThoughtsLength, noteFocus, isAbsoluteContext } = props
  const dispatch = useDispatch()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isPressed, setIsPressed] = useState<boolean>(false)

  /** Removes the cursor if the click goes all the way through to the content. Extends cursorBack with logic for closing modals. */
  const clickOnEmptySpace = () => {
    // make sure the the actual Content element has been clicked
    // otherwise it will incorrectly be called on mobile due to touch vs click ordering (#1029)
    if (!isPressed) return
    setIsPressed(false)

    // web only
    // click event occured during text selection has focus node of type text unlike normal event which has node of type element
    // prevent text selection from calling cursorBack incorrectly
    if (selection.isText()) return

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (showModal) {
      dispatch(closeModal())
    } else if (!noteFocus) {
      dispatch(cursorBackActionCreator())
      expandContextThought(null)
    }
  }
  const isPublishMode = publishMode()

  return (
    <div id='content-wrapper'>
      <ContentWrapper
        id='content'
        ref={contentRef}
        isTutorial={isTouch && isTutorialLocal && tutorialStep !== TUTORIAL2_STEP_SUCCESS}
        // TODO: Fix publish mode css
        className={classNames({
          publish: isPublishMode,
        })}
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
              <Subthoughts simplePath={isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH} expandable={true} />
            )}
          </>
        )}
      </ContentWrapper>
    </div>
  )
}

const ContentWrapper = styled.div<{ isTutorial?: boolean }>`
  ${tw`
    bg-white
    pt-20
    pr-2.5
    pb-40
    pl-12

    /* padding-bottom must cover the footer (logged out: 79px, logged in: 93px) plus some additional visual spacing */
    relative
    transition-transform

    /* forces footer to bottom when there is little content */
    box-border

    /* prevent expanded click areas from adding scroll-x */
    overflow-hidden
    mx-auto
    max-width[50em]

    /* forces footer to bottom when there is little content */
    min-height[100vh]

    sm:(
      max-width[80%]
    )

    lg:(
      max-width[66%]
    )

    dark:(
      bg-black
    )
  `}

  /* reduce bottom space during tutorial to try to keep the tutorial in view as much as possible */
  ${props =>
    props.isTutorial &&
    tw`
      min-height[auto]
      pb-5
  `}
`

export default connect(mapStateToProps)(Content)
