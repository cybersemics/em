import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { SwitchTransition } from 'react-transition-group'
import { css } from '../../../styled-system/css'
import { dialogRecipe } from '../../../styled-system/recipes'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useCommandList from '../../hooks/useCommandList'
import CommandUniverseGrid from '../CommandUniverseGrid'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import FadeTransition from '../FadeTransition'
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
 *
 * Renders the search row as a sibling of DialogContent (rather than inside the scroll container)
 * so the search input lives directly under the dialog header and the command list scrolls
 * underneath it without ever passing behind it.
 */
const MobileCommandUniverseContent = () => {
  const { search, setSearch, sortOrder, setSortOrder, groups } = useCommandList()
  const dialog = dialogRecipe()

  return (
    <>
      <div className={dialog.headerSearchRow}>
        <CommandUniverseSearch onInput={setSearch} />
        <CommandUniverseSortButton onSortChange={setSortOrder} />
      </div>

      <DialogContent>
        <SwitchTransition>
          <FadeTransition key={`${sortOrder}-${search}`} in={true} type='medium' unmountOnExit>
            <div>
              {groups.map((group, index) => (
                <div
                  key={group.title}
                  className={css({
                    position: 'relative',
                    contain: 'layout paint',
                  })}
                >
                  {/* Section header row — centered title flanked by gradient hairlines that fade outward to delimit each command group. */}
                  <div
                    className={css({
                      display: 'flex',
                      alignItems: 'center',
                      // 1rem horizontal gap between the title text and the gradient hairlines.
                      gap: '1rem',
                      paddingBlock: '1.25rem',
                    })}
                    // First group sits flush against the search row — skip its top padding so it doesn't double up.
                    style={index === 0 ? { paddingTop: 0 } : undefined}
                  >
                    {/* Left hairline: transparent at the panel edge, solid near the title. */}
                    <div
                      className={css({
                        flexGrow: 1,
                        height: '1px',
                        background:
                          'linear-gradient(to right, {colors.transparent} 0%, {colors.dialogHeaderDivider} 100%)',
                      })}
                    />
                    <h2
                      className={css({
                        fontSize: '1rem',
                        fontWeight: 500,
                        color: 'fg',
                        borderBottom: 'none',
                        margin: 0,
                        whiteSpace: 'nowrap',
                      })}
                    >
                      {group.title}
                    </h2>
                    {/* Right hairline: solid near the title, fading to transparent at the panel edge. */}
                    <div
                      className={css({
                        flexGrow: 1,
                        height: '1px',
                        background:
                          'linear-gradient(to right, {colors.dialogHeaderDivider} 0%, {colors.transparent} 100%)',
                      })}
                    />
                  </div>
                  <CommandUniverseGrid commands={group.commands} search={search} />
                </div>
              ))}
            </div>
          </FadeTransition>
        </SwitchTransition>
      </DialogContent>
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
          <DialogTitle onClose={handleClose}>Commands</DialogTitle>
          <MobileCommandUniverseContent />
        </Dialog>
      </FadeTransition>
    </>
  )
}

export default MobileCommandUniverse
