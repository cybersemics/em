import _ from 'lodash'
import { useTransform } from 'motion/react'
import { motion } from 'motion/react'
import pluralize from 'pluralize'
import { FC, useCallback, useRef, useState } from 'react'
import { Sheet, SheetProps, SheetRef } from 'react-modal-sheet'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { clearMulticursorsActionCreator as clearMulticursors } from '../../actions/clearMulticursors'
import { toggleDropdownActionCreator as toggleDropdown } from '../../actions/toggleDropdown'
import { isTouch } from '../../browser'
import categorize from '../../commands/categorize'
import copyCursorCommand from '../../commands/copyCursor'
import deleteCommand from '../../commands/delete'
import favorite from '../../commands/favorite'
import indent from '../../commands/indent'
import note from '../../commands/note'
import outdent from '../../commands/outdent'
import swapParent from '../../commands/swapParent'
import uncategorize from '../../commands/uncategorize'
import isTutorial from '../../selectors/isTutorial'
import fastClick from '../../util/fastClick'
import PanelCommand from './PanelCommand'
import PanelCommandGroup from './PanelCommandGroup'

/**
 * A custom hook that returns the last non-zero number of multicursors.
 * This is used to avoid showing the MultiselectMessage changing as the Command Center is closed.
 */
const useNonzeroNumMulticursors = () => {
  const numMulticursors = useSelector(state => Object.keys(state.multicursors).length)
  const lastNumMulticursorsRef = useRef(numMulticursors)

  // update ref if numMulticursors is not zero
  if (numMulticursors !== 0) {
    lastNumMulticursorsRef.current = numMulticursors
  }

  return lastNumMulticursorsRef.current
}

/** Shows a message with the number of thoughts selected, and a cancel button to deselect all. */
const MultiselectMessage: FC = () => {
  const displayNumMulticursors = useNonzeroNumMulticursors()
  return (
    <div>
      <span
        className={css({
          color: 'fg',
          fontWeight: 700,
          letterSpacing: '-0.011em',
          mixBlendMode: 'screen',
          opacity: 0.6,
          fontSize: '1.3em',
        })}
      >
        {displayNumMulticursors} {pluralize('thought', displayNumMulticursors, false)} selected
      </span>
    </div>
  )
}

/**
 * A panel that displays the Command Center.
 */
const CommandCenter = ({ mountPoint }: Pick<SheetProps, 'mountPoint'>) => {
  const dispatch = useDispatch()
  const showCommandCenter = useSelector(state => state.showCommandCenter)
  const isTutorialOn = useSelector(isTutorial)
  const ref = useRef<SheetRef>(null)

  const height = useTransform(() => {
    return ref.current?.yInverted.get() ?? 0
  })

  const blurHeight = useTransform(height, height => height + 110)

  const opacity = useTransform(() => {
    const y = ref.current?.yInverted.get() ?? 0
    const height = ref.current?.height ?? 0
    if (height === 0) return 0
    return y / height
  })

  const bottom = useTransform(() => {
    const y = ref.current?.y.get() ?? 0
    return -y
  })

  const [isFullyOpen, setIsFullyOpen] = useState(false)

  const onClose = useCallback(() => {
    dispatch([toggleDropdown({ dropDownType: 'commandCenter', value: false }), clearMulticursors()])
  }, [dispatch])

  if (isTouch && !isTutorialOn) {
    return (
      <>
        <motion.div
          /*
           * Progressive blur effect. Must be placed outside the Sheet to avoid separation
           * from the background content due to the fixed position of the parent.
           */
          className={css({
            position: 'fixed',
            pointerEvents: 'none',
            backdropFilter: 'blur(2px)',
            mask: 'linear-gradient(180deg, {colors.bgTransparent} 0%, black 110px, black 100%)',
            bottom: 0,
            width: '100%',
            height: 'calc(100% + 110px)',
          })}
          style={{
            height: blurHeight,
          }}
        />
        <Sheet
          data-testid='command-center-panel'
          onOpenEnd={() => {
            setIsFullyOpen(true)
          }}
          onCloseStart={() => {
            setIsFullyOpen(false)
          }}
          ref={ref}
          isOpen={showCommandCenter}
          onClose={onClose}
          detent='content'
          unstyled
          mountPoint={mountPoint}
        >
          <motion.div
            /** Falloff. */
            className={css({
              pointerEvents: 'none',
              position: 'absolute',
              background: 'linear-gradient(180deg, {colors.bgTransparent} 0%, {colors.bg} 1.2rem)',
              paddingTop: '0.8rem',
              bottom: 0,
              width: '100%',
              height: '100%',
            })}
            style={{ height }}
          />
          <motion.div
            className={css({
              position: 'fixed',
              pointerEvents: 'none',
              backgroundImage: 'url(/img/command-center/overlay.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center bottom',
              mixBlendMode: 'screen',
              height: '100vh',
              width: '100%',
              bottom: 0,
            })}
            style={{ opacity }}
          />
          <Sheet.Container
            data-testid='command-menu-panel'
            style={{
              backgroundColor: 'transparent',
              // Make sure it overrides any inline styles
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              overflow: 'visible',
              maxHeight: '70%',
              pointerEvents: 'auto',
              boxShadow: 'none',
              zIndex: 'auto',
              bottom,
            }}
            className={css({
              /**
               * Override inline transform styles, to rely only on bottom.
               * This way no new stacking context is created.
               * This needs to be set in className, as react-modal-sheet
               * will override the transform value passed in inside style.
               */
              transform: 'none !important',
            })}
          >
            <Sheet.Content
              style={{
                overflow: 'visible',
              }}
            >
              <div
                className={css({
                  display: 'flex',
                  flexDirection: 'column',
                  margin: '0 1.5rem calc(1.5rem + env(safe-area-inset-bottom)) 1.5rem',
                  gap: '1rem',
                })}
              >
                <div
                  className={css({
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                  })}
                >
                  <MultiselectMessage />
                  <div
                    className={css({
                      display: 'grid',
                      // Define a single area for stacking. Cannot use position relative,
                      // since that will create a new stacking context and break mix-blend-mode.
                      gridTemplateAreas: '"button"',
                      fontSize: '0.85em',
                      fontWeight: 500,
                      letterSpacing: '-0.011em',
                      color: 'fg',
                    })}
                  >
                    <div
                      className={css({
                        gridArea: 'button',
                        background: 'fgOverlay20',
                        borderRadius: 46,
                        mixBlendMode: 'soft-light',
                      })}
                    />
                    <button
                      {...fastClick(onClose)}
                      className={css({
                        all: 'unset',
                        gridArea: 'button',
                        mixBlendMode: 'lighten',
                        opacity: 0.5,
                        fontWeight: 500,
                        cursor: 'pointer',
                        padding: '8px 16px',
                      })}
                    >
                      Done
                    </button>
                  </div>
                </div>
                <div
                  className={css({
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gridTemplateRows: 'auto',
                    gridAutoFlow: 'row',
                    gap: '0.7rem',
                    gridRowGap: '1rem',
                  })}
                >
                  <PanelCommand
                    isGlowReady={isFullyOpen}
                    command={{ ...copyCursorCommand, label: 'Copy' }}
                    size='small'
                  />
                  <PanelCommand isGlowReady={isFullyOpen} command={note} size='small' />
                  <PanelCommand isGlowReady={isFullyOpen} command={{ ...favorite, label: 'Favorite' }} size='small' />
                  <PanelCommand isGlowReady={isFullyOpen} command={deleteCommand} size='small' />
                  <PanelCommandGroup commandSize='small' commandCount={2}>
                    <PanelCommand isGlowReady={isFullyOpen} command={{ ...outdent, label: '' }} size='small' />
                    <PanelCommand isGlowReady={isFullyOpen} command={{ ...indent, label: '' }} size='small' />
                  </PanelCommandGroup>
                  <PanelCommand isGlowReady={isFullyOpen} command={swapParent} size='medium' />
                  <PanelCommand isGlowReady={isFullyOpen} command={categorize} size='medium' />
                  <PanelCommand isGlowReady={isFullyOpen} command={uncategorize} size='medium' />
                </div>
              </div>
            </Sheet.Content>
          </Sheet.Container>
        </Sheet>
      </>
    )
  }
}

export default CommandCenter
