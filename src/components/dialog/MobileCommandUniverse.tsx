import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { toggleMobileCommandUniverseActionCreator } from '../../actions/toggleMobileCommandUniverse'
import useCommandList from '../../hooks/useCommandList'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import durations from '../../util/durations'
import CommandUniverseGrid from '../CommandUniverseGrid'
import CommandUniverseSearch from '../CommandUniverseSearch'
import CommandUniverseSortButton from '../CommandUniverseSortButton'
import FadeTransition from '../FadeTransition'
import Dialog from './Dialog'
import DialogContent from './DialogContent'
import DialogHeader from './DialogHeader'

/** Stable array identity lets usePrefetchImages decode the assets once when this component mounts. */
const DIALOG_IMAGES = [
  '/img/dialog/dialog-background-glow.avif',
  '/img/dialog/dialog-highlight.avif',
  '/img/dialog/dialog-highlight-rainbow.avif',
  '/img/dialog/toggle-option-glow.avif',
]

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

  // Pass this ref to `DialogContent`, which owns the scrollable element, so that we can reset
  // the scroll position to the top as results crossfade.
  const scrollRef = React.useRef<HTMLDivElement>(null)

  return (
    <>
      <CommandUniverseSortButton onSortChange={setSortOrder}>
        <CommandUniverseSearch onInput={setSearch} />
      </CommandUniverseSortButton>

      <DialogContent scrollRef={scrollRef}>
        {/* Keep outgoing results through their exit before mounting the latest requested
            sort/search results. The first list uses the dialog's own entry fade instead. */}
        <AnimatePresence initial={false} mode='wait'>
          <motion.div
            key={`${sortOrder}-${search}`}
            role='region'
            aria-label='Command results'
            initial='hidden'
            animate='visible'
            exit='hidden'
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            transition={{ duration: durations.get('medium') / 1000, ease: 'easeInOut' }}
            onAnimationStart={animation => {
              // Reset only for incoming results; scrolling the outgoing list would visibly jump.
              if (animation === 'visible') scrollRef.current?.scrollTo({ top: 0 })
            }}
          >
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
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </>
  )
}

/**
 * Mobile Command Universe component.
 */
const MobileCommandUniverse: React.FC = () => {
  usePrefetchImages(DIALOG_IMAGES)
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
      <FadeTransition in={isOpen} unmountOnExit type='medium' nodeRef={nodeRef}>
        <Dialog onClose={handleClose} nodeRef={nodeRef}>
          <DialogHeader onClose={handleClose}>Commands</DialogHeader>
          <MobileCommandUniverseContent />
        </Dialog>
      </FadeTransition>
    </>
  )
}

export default MobileCommandUniverse
