import React, { PropsWithChildren } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { toggleHelpGenieActionCreator as toggleHelpGenie } from '../../actions/toggleHelpGenie'
import ArrowLeftIcon from '../icons/ArrowLeftIcon'
import ArrowRightIcon from '../icons/ArrowRightIcon'
import InfoGenieIcon from '../icons/InfoGenieIcon'
import XIcon from '../icons/XIcon'
import CircleButton from './CircleButton'

interface DialogHeaderProps {
  onClose: () => void
  onBack?: () => void
  onForward?: () => void
  canGoBack?: boolean
  canGoForward?: boolean
}

/**
 * Dialog header row. Three parts: left button cluster (Back/Forward), centered title,
 * right button cluster (Help/Close). The flex:1 cluster wrappers balance the row so
 * the title stays optically centered.
 *
 * Back and Forward navigate the dialog history. Help lets the help genie out, or puts it back.
 */
const DialogHeader: React.FC<PropsWithChildren<DialogHeaderProps>> = ({
  children,
  onClose,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false,
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
    },
  })
  return (
    <div
      className={css({
        display: 'flex',
        alignItems: 'center',
        // 1rem inset on the sides and the top edge of the dialog; the bottom is tighter
        // so the search row that follows sits closer to the header.
        paddingInline: '1rem',
        paddingTop: '1rem',
        paddingBottom: '0.5rem',
      })}
    >
      <div className={headerSide}>
        <CircleButton ariaLabel='Back' onClick={onBack} disabled={!canGoBack}>
          <ArrowLeftIcon size={24} fill={iconFill} />
        </CircleButton>
        <CircleButton ariaLabel='Forward' onClick={onForward} disabled={!canGoForward}>
          <ArrowRightIcon size={24} fill={iconFill} />
        </CircleButton>
      </div>
      <h2
        className={css({
          fontWeight: '400',
          color: 'fg',
          borderBottom: 'none',
          fontSize: '1.25rem',
          margin: 0,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        })}
      >
        {children}
      </h2>
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
    </div>
  )
}

export default DialogHeader
