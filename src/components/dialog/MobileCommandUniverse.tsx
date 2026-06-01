import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SwitchTransition } from 'react-transition-group'
import { css, cx } from '../../../styled-system/css'
import { modalTextRecipe } from '../../../styled-system/recipes'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useCommandList from '../../hooks/useCommandList'
import CommandUniverseGrid from '../CommandUniverseGrid'
import FadeTransition from '../FadeTransition'
import SearchCommands from '../SearchCommands'
import SortButton from '../SortButton'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogTitle from './DialogTitle'

/**
 * Pre-rendered hidden divs that force the browser to fetch the dialog's decorative AVIFs ahead of time, so they are cached when the dialog opens. Same workaround pattern used by CommandCenter's HiddenOverlay. Always mounted because the parent is rendered at the AppComponent level.
 */
const HiddenDialogAssets = () => (
  <>
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-background-glow.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight.avif)', visibility: 'hidden' })} />
    <div className={css({ backgroundImage: 'url(/img/dialog/dialog-highlight-rainbow.avif)', visibility: 'hidden' })} />
  </>
)

/**
 * Body of the dialog. Split out from MobileCommandUniverse so that useCommandList only runs while the dialog is open.
 * If it ran always, useFilteredCommands inside the hook would remain subscribed to gestureStore, and this would
 * trigger unnecessary re-renders when gestures are inputted.
 */
const MobileCommandUniverseContent = () => {
  const { search, setSearch, sortOrder, setSortOrder, groups } = useCommandList()
  const modalClasses = modalTextRecipe()

  return (
    <>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: '5px',
          position: 'relative',
          zIndex: 1,
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton onSortChange={setSortOrder} />
      </div>

      <SwitchTransition>
        <FadeTransition key={`${sortOrder}-${search}`} in={true} type='medium' unmountOnExit>
          <div>
            {groups.map(group => (
              <div
                key={group.title}
                className={css({
                  position: 'relative',
                  contain: 'layout paint',
                })}
              >
                <h2
                  className={cx(
                    modalClasses.subtitle,
                    css({
                      fontSize: '1.15rem',
                      borderBottom: 'none',
                      padding: '0.5rem 0 1rem 0',
                      margin: '0.444rem 0 0 0',
                    }),
                  )}
                >
                  {group.title}
                </h2>
                <CommandUniverseGrid commands={group.commands} search={search} />
              </div>
            ))}
          </div>
        </FadeTransition>
      </SwitchTransition>
    </>
  )
}

/**
 * Mobile Command Universe component.
 */
const MobileCommandUniverse: React.FC = () => {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.showMobileCommandUniverse)
  const nodeRef = React.useRef<HTMLDivElement>(null)

  /**
   * Handles the closure of the mobile command universe.
   */
  const handleClose = () => {
    dispatch(toggleMobileCommandUniverseActionCreator({ value: false }))
  }

  return (
    <>
      <HiddenDialogAssets />
      <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
        <Dialog onClose={handleClose} nodeRef={nodeRef}>
          <DialogTitle onClose={handleClose}>Command Universe</DialogTitle>
          <DialogContent>
            <MobileCommandUniverseContent />
          </DialogContent>
        </Dialog>
      </FadeTransition>
    </>
  )
}

export default MobileCommandUniverse
