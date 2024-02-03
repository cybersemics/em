import React from 'react'
import { useSelector } from 'react-redux'
import GesturePath from '../@types/GesturePath'
import { isTouch } from '../browser'
import { TUTORIAL_STEP_FIRSTTHOUGHT } from '../constants'
import getSetting from '../selectors/getSetting'
import themeColors from '../selectors/themeColors'
import { shortcutById } from '../shortcuts'
import offlineStatusStore from '../stores/offlineStatusStore'
import GestureDiagram from './GestureDiagram'
import LoadingEllipsis from './LoadingEllipsis'

const newThoughtShortcut = shortcutById('newThought')

/** Display platform-specific instructions of how to create a thought when a context has no thoughts. */
const EmptyThoughtspace = ({ isTutorial }: { isTutorial?: boolean }) => {
  /*
    Determining when to show the loader is nontrivial due to many loading states of local and remote, connection and authentication status, and pending thoughts.

    state.status and state.isLoading are very fragile. They are coupled to pull, updateThoughts, and EmptyThoughtspace.

    Related:
    - https://github.com/cybersemics/em/issues/1344
    - https://github.com/cybersemics/em/pull/1345
  */
  const isLoading = useSelector(state => state.isLoading)
  const status = offlineStatusStore.useState()

  const tutorialStep = useSelector(state => +(getSetting(state, 'Tutorial Step') || 0))

  const colors = useSelector(themeColors)

  return (
    <div className='empty-thoughtspace'>
      {
        // show nothing during the preconnecting phase (See: useOfflineStatus)
        // show loading ellipsis when connecting or loading
        status === 'preconnecting' ? null : status === 'connecting' || (isLoading && status !== 'offline') ? (
          // (except when offline, otherwise the loading ellipsis will be shown indefinitely in the rare case where the tutorial has been closed but there are no thoughts)
          <LoadingEllipsis delay={1500} text={status === 'connecting' ? 'Connecting' : 'Loading'} center />
        ) : // tutorial no children
        // show special message when there are no children in tutorial
        isTutorial ? (
          tutorialStep !== TUTORIAL_STEP_FIRSTTHOUGHT || !isTouch ? (
            <div className='center-in-content'>
              <i className='text-note'>Ahhh. Open space. Unlimited possibilities.</i>
            </div>
          ) : // hide on mobile during TUTORIAL_STEP_FIRSTTHOUGHT since the gesture diagram is displayed
          null
        ) : (
          // default
          <>
            <span style={{ userSelect: 'none' }}>
              {isTouch ? (
                <span className='gesture-container'>
                  Swipe{' '}
                  <GestureDiagram path={newThoughtShortcut.gesture as GesturePath} size={30} color={colors.gray66} />
                </span>
              ) : (
                <span>Hit the Enter key</span>
              )}{' '}
              to add a new thought.
            </span>
          </>
        )
      }
    </div>
  )
}

const EmptyThoughtspaceMemo = React.memo(EmptyThoughtspace)
EmptyThoughtspaceMemo.displayName = 'EmptyThoughtspace'

export default EmptyThoughtspaceMemo
