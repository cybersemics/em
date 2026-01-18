import * as Dialog from '@radix-ui/react-dialog'
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import _ from 'lodash'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { toggleSidebarActionCreator } from '../actions/toggleSidebar'
import { LongPressState } from '../constants'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import FadeTransition from './FadeTransition'
import Favorites from './Favorites'
import RecentlyDeleted from './RecentlyDeleted'
import RecentlyEdited from './RecentlyEdited'

type SidebarSection = 'favorites' | 'recentEdited' | 'deletedEdited'

/** A link to a sidebar section. */
const SidebarLink = ({
  active,
  section,
  setSection,
  text,
}: {
  active?: boolean
  section: SidebarSection
  setSection: (section: SidebarSection) => void
  text: string
}) => {
  return (
    <a
      {...fastClick(() => setSection(section))}
      data-testid={`sidebar-${section}`}
      className={css({
        color: active ? 'fg' : 'gray50',
        display: 'inline-block',
        fontSize: '1.2em',
        fontWeight: 600,
        margin: '0.5em 1em 0 0',
        textDecoration: 'none',
      })}
    >
      {text}
    </a>
  )
}

/** The sidebar component. */
const Sidebar = () => {
  const [isSwiping, setIsSwiping] = useState(false)
  const showSidebar = useSelector(state => state.showSidebar)
  const fontSize = useSelector(state => state.fontSize)
  const dispatch = useDispatch()
  const [section, setSection] = useState<SidebarSection>('favorites')

  /** Track the current x position of the sidebar. This is used for progress- animations. */
  const x = useMotionValue(0)

  /** Toggle the sidebar. */
  const toggleSidebar = (value: boolean) => {
    dispatch([toggleSidebarActionCreator({ value })])
  }

  /** Dynamically determine the width of the sidebar. */
  const sidebarWidth = typeof window !== 'undefined' && window.innerWidth < 768 ? '90%' : '400px'

  /** Get the width of the sidebar in pixels, which is used for progress-based animations. */
  const sidebarWidthPx = typeof window !== 'undefined' && window.innerWidth < 768 ? window.innerWidth * 0.9 : 400

  /** Link opacity to x position of the sidebar. 1 when open, 0 when closed. */
  const opacity = useTransform(x, [-sidebarWidthPx, 0], [0, 1])

  /** MUI-style cubic-bezier transition. */
  const transition = {
    duration: durations.get('fast') / 1000,
    ease: [0, 0, 0.2, 1] as const,
  }

  /** Lock body scroll when sidebar is open. */
  useEffect(() => {
    if (showSidebar) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [showSidebar])

  /* Watch for esc key. Handling this manually makes sure the current selection in the editor is kept when esc is hit. */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        toggleSidebar(false)
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toggleSidebar])

  return (
    <Dialog.Root open={showSidebar} onOpenChange={toggleSidebar} modal={false}>
      {/* forceMount prop keeps the sidebar mounted when closed.
      this is temporarily added to match the behavior of the outgoing MUI drawer
      it can be removed in a later PR to optimize performance */}
      <Dialog.Portal forceMount>
        <AnimatePresence onExitComplete={() => toggleSidebar(false)}>
          {showSidebar && (
            <motion.div
              key='sidebar-overlay'
              style={{ opacity }}
              onClick={() => toggleSidebar(false)}
              className={css({
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 'sidebar',
              })}
            />
          )}
          {showSidebar && (
            <Dialog.Content
              asChild
              forceMount
              key='sidebar-content'
              onInteractOutside={e => e.preventDefault()} // This is needed to prevent the sidebar from double-toggling when tapping hamburger icon
            >
              <motion.div
                data-testid='sidebar'
                style={{ x }}
                drag='x'
                dragConstraints={{ left: -sidebarWidthPx, right: 0 }}
                dragElastic={1e-9} // This disables elastic overscroll.
                onDragStart={() => setIsSwiping(true)}
                onDragEnd={(e, info) => {
                  setIsSwiping(false)

                  // Check that the swipe meets the threshold to close.
                  // The swipe either needs to be at least 100px or have a velocity of at least 500px/s.
                  if (info.offset.x < -100 || info.velocity.x < -500) {
                    toggleSidebar(false)
                  } else {
                    // Snap back to 0
                    animate(x, 0, transition)
                  }
                }}
                initial={{ x: -sidebarWidthPx }}
                animate={{ x: 0 }}
                exit={{ x: -sidebarWidthPx }}
                transition={transition}
                className={css({
                  position: 'fixed',
                  top: 'safeAreaTop',
                  left: 0,
                  bottom: 0,
                  width: sidebarWidth,
                  backgroundColor: 'sidebarBg',
                  zIndex: 'sidebar !important',
                  userSelect: 'none',
                  boxShadow: '0 0 20px rgba(0,0,0,0.2)',
                  outline: 'none',
                })}
              >
                <div
                  onTouchMove={_.throttle(
                    () => {
                      if (isSwiping) return
                      if (x.get() !== 0) {
                        setIsSwiping(true)
                        dispatch(longPress({ value: LongPressState.Inactive }))
                      }
                    },
                    10,
                    { leading: false },
                  )}
                  onTouchEnd={() => {
                    setIsSwiping(false)
                  }}
                  className={css({ height: '100%' })}
                >
                  <div
                    aria-label='sidebar'
                    className={css({
                      background: 'sidebarBg',
                      overflowY: 'scroll',
                      overflowX: 'hidden',
                      overscrollBehavior: 'contain',
                      boxSizing: 'border-box',
                      width: '100%',
                      height: '100%',
                      color: 'fg',
                      scrollbarWidth: 'thin',
                      lineHeight: 1.8,
                      '&::-webkit-scrollbar': {
                        width: '0px',
                        background: 'transparent',
                        display: 'none',
                      },
                      userSelect: 'none',
                      position: 'relative',
                      padding: '0 1em',
                    })}
                    data-scroll-at-edge
                  >
                    <FadeTransition type='fast' in={showSidebar}>
                      <div
                        style={{
                          marginLeft: fontSize * 1.3 + 30,
                        }}
                      >
                        <SidebarLink
                          active={section === 'favorites'}
                          section='favorites'
                          setSection={setSection}
                          text='Favorites'
                        />
                        <SidebarLink
                          active={section === 'recentEdited'}
                          section='recentEdited'
                          setSection={setSection}
                          text='Recently Edited'
                        />
                        <SidebarLink
                          active={section === 'deletedEdited'}
                          section='deletedEdited'
                          setSection={setSection}
                          text='Recently Deleted'
                        />
                      </div>
                    </FadeTransition>

                    {section === 'favorites' ? (
                      <Favorites disableDragAndDrop={isSwiping} />
                    ) : section === 'recentEdited' ? (
                      <RecentlyEdited />
                    ) : section === 'deletedEdited' ? (
                      <RecentlyDeleted />
                    ) : (
                      'Not yet implemented'
                    )}
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default Sidebar
