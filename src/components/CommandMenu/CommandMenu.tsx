import _ from 'lodash'
import { useTransform } from 'motion/react'
import { motion } from 'motion/react'
import pluralize from 'pluralize'
import { FC, useCallback, useRef } from 'react'
import { Sheet, SheetRef } from 'react-modal-sheet'
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
 * This is used to avoid showing the MultiselectMessage changing as the Command Menu is closed.
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
 * A panel that displays the command menu.
 */
const CommandMenu = () => {
  const dispatch = useDispatch()
  const showCommandMenu = useSelector(state => state.showCommandMenu)
  const isTutorialOn = useSelector(isTutorial)
  const ref = useRef<SheetRef>(null)

  const height = useTransform(() => {
    return ref.current?.yInverted.get() ?? 0
  })

  const opacity = useTransform(() => {
    const y = ref.current?.yInverted.get() ?? 0
    const height = ref.current?.height ?? 0
    return y / height
  })

  const onClose = useCallback(() => {
    dispatch([toggleDropdown({ dropDownType: 'commandMenu', value: false }), clearMulticursors()])
  }, [dispatch])

  if (isTouch && !isTutorialOn) {
    console.log('showCommandMenu', showCommandMenu)
    return (
      <Sheet ref={ref} isOpen={showCommandMenu} onClose={onClose} detent='content' unstyled>
        <motion.div
          /** Progressive blur. */
          className={css({
            pointerEvents: 'none',
            position: 'absolute',
            backdropFilter: 'blur(2px)',
            mask: 'linear-gradient(180deg, {colors.bgTransparent} 0%, black 110px, black 100%)',
            bottom: 0,
            width: '100%',
            height: 'calc(100% + 110px)',
          })}
          style={{
            height: height,
          }}
        />
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
        <Sheet.Backdrop
          style={{
            opacity,
          }}
          className={css({
            zIndex: 'auto',
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
          }}
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
                <PanelCommand command={{ ...copyCursorCommand, label: 'Copy' }} size='small' />
                <PanelCommand command={note} size='small' />
                <PanelCommand command={{ ...favorite, label: 'Favorite' }} size='small' />
                <PanelCommand command={deleteCommand} size='small' />
                <PanelCommandGroup commandSize='small' commandCount={2}>
                  <PanelCommand command={{ ...outdent, label: '' }} size='small' />
                  <PanelCommand command={{ ...indent, label: '' }} size='small' />
                </PanelCommandGroup>
                <PanelCommand command={swapParent} size='medium' />
                <PanelCommand command={categorize} size='medium' />
                <PanelCommand command={uncategorize} size='medium' />
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    )
  }
}

export default CommandMenu
