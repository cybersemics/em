import classNames from 'classnames'
import React, { FC, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Dispatch from '../@types/Dispatch'
import SimplePath from '../@types/SimplePath'
import { Thunk } from '../@types/Thunk'
import { closeModalActionCreator as closeModal } from '../actions/closeModal'
import { expandContextThoughtActionCreator as expandContextThought } from '../actions/expandContextThought'
import { toggleColorPickerActionCreator as toggleColorPicker } from '../actions/toggleColorPicker'
import { isTouch } from '../browser'
import { ABSOLUTE_PATH, HOME_PATH, TUTORIAL2_STEP_SUCCESS } from '../constants'
import * as selection from '../device/selection'
import { childrenFilterPredicate, filterAllChildren } from '../selectors/getChildren'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isAbsolute from '../util/isAbsolute'
import publishMode from '../util/publishMode'
import Editable from './Editable'
import EmptyThoughtspace from './EmptyThoughtspace'
import LayoutTree from './LayoutTree'
import Search from './Search'

const transientChildPath = ['TRANSIENT_THOUGHT_ID'] as SimplePath

/*
  Transient Editable represents a child that is yet not in the state.
  But as soon as user types it adds the child to the state with the new value and vanishes.
  However removing the transient editable should be handled by some business logic by parent components.
*/
const TransientEditable = (
  <Editable transient={true} path={transientChildPath} simplePath={transientChildPath} rank={0} />
)

/** The main content section of em. */
const Content: FC = () => {
  const dispatch = useDispatch()
  const contentRef = useRef<HTMLDivElement>(null)
  const [isPressed, setIsPressed] = useState<boolean>(false)
  const tutorial = useSelector(isTutorial)
  const tutorialStep = useSelector(state => +(getSetting(state, 'Tutorial Step') || 1))
  const search = useSelector(state => state.search)
  const rootThoughtsLength = useSelector(state => {
    const rankedRoot = isAbsolute(state.rootContext) ? ABSOLUTE_PATH : HOME_PATH
    const children = filterAllChildren(state, head(rankedRoot), childrenFilterPredicate(state, rankedRoot))
    return children.length
  })
  const isAbsoluteContext = useSelector(state => isAbsolute(state.rootContext))

  /** Removes the cursor if the click goes all the way through to the content. Extends cursorBack with logic for closing modals. */
  const clickOnEmptySpace: Thunk = (dispatch: Dispatch, getState) => {
    const state = getState()

    // make sure the the actual Content element has been clicked
    // otherwise it will incorrectly be called on mobile due to touch vs click ordering (#1029)
    if (!isPressed) return
    setIsPressed(false)

    dispatch([state.showColorPicker ? toggleColorPicker({ value: false }) : null])

    // web only
    // click event occured during text selection has focus node of type text unlike normal event which has node of type element
    // prevent text selection from calling cursorBack incorrectly
    if (selection.isText()) return

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    dispatch([
      state.showModal ? closeModal() : null,
      state.expandedContextThought && !state.noteFocus ? expandContextThought(null) : null,
    ])
  }

  /** Generate class names. */
  const contentClassNames = useMemo(
    () =>
      classNames({
        content: true,
        'content-tutorial': isTouch && tutorial && tutorialStep !== TUTORIAL2_STEP_SUCCESS,
        publish: publishMode(),
      }),
    [tutorialStep, tutorial],
  )

  return (
    <div id='content-wrapper'>
      <div
        id='content'
        ref={contentRef}
        className={contentClassNames}
        {...fastClick(() => dispatch(clickOnEmptySpace))}
        onMouseDown={() => setIsPressed(true)}
      >
        {search != null ? (
          <Search />
        ) : (
          <>
            {rootThoughtsLength === 0 ? (
              <EmptyThoughtspace isTutorial={tutorial} />
            ) : isAbsoluteContext ? (
              TransientEditable
            ) : (
              /* <Subthoughts simplePath={isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH} expandable={true} /> */
              <LayoutTree />
            )}
          </>
        )}
      </div>
    </div>
  )
}

const ContentMemo = React.memo(Content)
ContentMemo.displayName = 'Content'

export default Content
