import React, { FC, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Dispatch from '../@types/Dispatch'
import SimplePath from '../@types/SimplePath'
import { Thunk } from '../@types/Thunk'
import { closeModalActionCreator as closeModal } from '../actions/closeModal'
import { toggleDropdownActionCreator as toggleDropdown } from '../actions/toggleDropdown'
import { isTouch } from '../browser'
import {
  ABSOLUTE_PATH,
  CONTENT_BOX_PADDING_LEFT,
  CONTENT_BOX_PADDING_RIGHT,
  HOME_PATH,
  LongPressState,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants'
import { childrenFilterPredicate, filterAllChildren } from '../selectors/getChildren'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'
import viewportStore from '../stores/viewport'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isAbsolute from '../util/isAbsolute'
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
  <Editable isEditing={false} transient={true} path={transientChildPath} simplePath={transientChildPath} rank={0} />
)

/** A hook that returns a ref to the content div and updates the viewport store's contentWidth property on resize. */
const useContentWidth = () => {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contentRef.current) return

    const resizeObserver = new ResizeObserver(entries => {
      viewportStore.update({ contentWidth: entries[0]?.contentRect.width || 0 })
    })

    resizeObserver.observe(contentRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  return contentRef
}

/** The main content section of em. */
const Content: FC = () => {
  const dispatch = useDispatch()
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

  /** Closes modals and dropdowns if the click goes all the way through to the content. */
  const clickOnEmptySpace: Thunk = (dispatch: Dispatch, getState) => {
    const state = getState()

    // make sure the the actual Content element has been clicked
    // otherwise it will incorrectly be called on mobile due to touch vs click ordering (#1029)
    // also make sure that the click doesn't occur during a long press (#3120)
    if (!isPressed || state.longPress !== LongPressState.Inactive) return
    setIsPressed(false)

    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    dispatch([state.showModal ? closeModal() : null, toggleDropdown()])
  }

  const contentRef = useContentWidth()

  return (
    <div
      id='content-wrapper'
      {...fastClick(() => dispatch(clickOnEmptySpace), { enableHaptics: false })}
      onMouseDown={() => setIsPressed(true)}
    >
      <div
        id='content'
        ref={contentRef}
        className={css({
          position: 'relative',
          transition: 'transform 0 ease-out, margin 0 ease-out',
          boxSizing: 'border-box',
          // limit line width for easier reading
          maxWidth: '60em',
          margin: '0 auto',
          minHeight: '100vh',
          // Disallow text selection on the entire tree to prevent selection of scroll zone and other background elements when dragging.
          // This is overriden by the editable recipe to enable text selection on editable thoughts.
          // https://github.com/cybersemics/em/pull/2962
          userSelect: 'none',
          zIndex: 'content',
          '@media (max-width: 960px)': {
            maxWidth: '80%',
          },
          '@media (max-width: 560px)': {
            maxWidth: '50em',
            paddingLeft: '40px',
          },
          ...(isTouch &&
            tutorial &&
            tutorialStep !== TUTORIAL2_STEP_SUCCESS && {
              /* reduce bottom space during tutorial to try to keep the tutorial in view as much as possible */
              minHeight: 'auto',
              paddingBottom: '20px',
            }),
        })}
        style={{
          // Moved from css({...}) because PandaCSS requires statically analyzable values at build time.
          // Template literals with runtime variables like `80px ${CONTENT_BOX_PADDING_RIGHT}px 153px ${CONTENT_BOX_PADDING_LEFT}px`
          // cannot be determined during static analysis, so PandaCSS doesn't generate the corresponding CSS.
          // Using inline styles ensures these dynamic padding values work correctly at runtime.
          padding: `80px ${CONTENT_BOX_PADDING_RIGHT}px 153px ${CONTENT_BOX_PADDING_LEFT}px`,
        }}
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
