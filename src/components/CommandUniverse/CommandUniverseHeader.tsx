import React, { PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { toggleHelpGenieActionCreator as toggleHelpGenie } from '../../actions/toggleHelpGenie'
import CircleButton from '../dialog/CircleButton'
import DialogHeader from '../dialog/DialogHeader'
import ArrowLeftIcon from '../icons/ArrowLeftIcon'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import InfoGenieIcon from '../icons/InfoGenieIcon'
import XIcon from '../icons/XIcon'

interface CommandUniverseHeaderProps {
  onClose: () => void
  onBack?: () => void
  onForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
  searchControls?: React.ReactNode
}

/**
 * Dialog header row. Three parts: left button cluster (Back/Forward), centered title,
 * right button cluster (Help/Close). The flex:1 cluster wrappers balance the row so
 * the title stays optically centered.
 *
 * Back and Forward navigate the dialog history. Help lets the help genie out, or puts it back.
 */
const CommandUniverseHeader: React.FC<PropsWithChildren<CommandUniverseHeaderProps>> = ({
  children,
  onClose,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false,
  searchControls,
}) => {
  const iconFill = token('colors.dialogHeaderButtonIcon')
  const dispatch = useDispatch()
  const genieVisible = useSelector(state => state.helpGenie.visible)
  const genieUnavailable = useSelector(state => state.helpGenie.unavailable)
  // Left/right header cluster wrapper — the flex container that holds the circular header buttons.
  // `flex: 1` lets each cluster claim half the row so the centered title sits in the middle.
  // `&:last-child` aligns the right cluster's buttons to the trailing edge.
  const headerSide = css({
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
    '&:last-child': {
      justifyContent: 'flex-end',
      lg: { flex: '0 0 auto' },
    },
    '&:first-child': {
      lg: { flex: '0 0 auto' },
    },
  })
  return (
    <DialogHeader>
      {searchControls && (
        <div
          aria-hidden
          className={css({
            position: 'absolute',
            inset: 0,
            // Hangs 2rem below the header and fades out across its bottom edge, so the light dissolves into the list
            // instead of stopping at a hard line where the header meets it. The list paints above this layer, so the
            // overhang only lights the glass behind the rows.
            bottom: '-2rem',
            pointerEvents: 'none',
            backgroundImage: 'url(/img/dialog/dialog-search-background.avif)',
            // Offset by half the overhang so the image stays centred on the header row rather than on the taller box.
            backgroundPosition: 'center calc(50% - 1rem)',
            backgroundSize: 'cover',
            maskImage: 'linear-gradient(to bottom, black 0, black calc(100% - 3.5rem), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 0, black calc(100% - 3.5rem), transparent 100%)',
            opacity: 0.14,
            mixBlendMode: 'overlay',
          })}
        />
      )}
      {!searchControls && (
        <div className={headerSide}>
          <CircleButton ariaLabel='Back' onClick={onBack} disabled={!canGoBack}>
            <ArrowLeftIcon size={24} fill={iconFill} />
          </CircleButton>
          <CircleButton ariaLabel='Forward' onClick={onForward} disabled={!canGoForward}>
            <ArrowRightIcon size={24} fill={iconFill} />
          </CircleButton>
        </div>
      )}
      {!searchControls && (
        <h2
          className={css({
            fontWeight: '400',
            color: 'fg',
            borderBottom: 'none',
            fontSize: '1.25rem',
            margin: 0,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            lg: { textAlign: 'left', flex: 1 },
          })}
        >
          {children}
        </h2>
      )}
      {searchControls && (
        <div className={css({ display: 'flex', flex: 1, minWidth: 0, alignItems: 'center', gap: '0.5rem' })}>
          {searchControls}
        </div>
      )}
      <div className={headerSide}>
        <CircleButton
          ariaLabel='Help'
          pressed={genieVisible}
          disabled={genieUnavailable}
          onClick={() => dispatch(toggleHelpGenie({}))}
        >
          <InfoGenieIcon size={24} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Close' onClick={onClose}>
          <XIcon size={24} fill={iconFill} />
        </CircleButton>
      </div>
    </DialogHeader>
  )
}

export default CommandUniverseHeader
