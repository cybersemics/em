import { FC, PropsWithChildren, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import TipId from '../../@types/TipId'
import { dismissTipActionCreator as dismissTip } from '../../actions/dismissTip'
import { isTouch } from '../../browser'
import usePrefetchImages from '../../hooks/usePrefetchImages'
import fastClick from '../../util/fastClick'
import CloseIcon from '../icons/CloseIcon'
import NotificationSurface from './NotificationSurface'

/** A bottom-screen tip with its own visibility rules, message, and Clear control. */
const Tip: FC<PropsWithChildren<{ tipId: TipId }>> = ({ tipId, children }) => {
  const surfaceRef = useRef<{ dismiss: () => void }>(null)
  const dispatch = useDispatch()
  const tip = useSelector(state => state.tip)

  // Hide tips temporarily while another surface needs the user's attention.
  const isHidden = useSelector(
    state => (state.isKeyboardOpen && isTouch) || state.showCommandCenter || state.showSidebar || !!state.showModal,
  )

  /** Prefetch the glow image before the tip becomes visible. */
  usePrefetchImages(['/img/tip/tip-glow-alpha.webp'])

  const isTipActive = tip === tipId

  return isTipActive ? (
    <NotificationSurface
      ref={surfaceRef}
      key={tipId}
      anchor={{ base: 'bottom-full', lg: 'bottom-right' }}
      glow='rainbow'
      isVisible={!isHidden}
      swipeToDismiss
      onDismiss={() => dispatch(dismissTip())}
    >
      {/* TIP label — plus-lighter gives it a subtle luminous effect against the gradient. */}
      <span
        className={css({
          fontSize: '0.75rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          color: 'fg',
          mixBlendMode: 'plus-lighter',
          opacity: 0.5,
          textShadow: '0 0 8px {colors.fgOverlay40}',
        })}
      >
        TIP
      </span>

      <div
        className={css({
          color: 'fg',
          maxWidth: '24rem',
          opacity: 0.8,
          fontSize: '1rem',
          mixBlendMode: 'plus-lighter',
          lineHeight: 1.4,
          fontWeight: 600,
          textShadow: '0 0 4px {colors.fgOverlay40}',
        })}
      >
        {children}
      </div>

      <div
        className={css({
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          cursor: 'pointer',
          color: 'fg',
          mixBlendMode: 'overlay',
          opacity: 0.6,
          textShadow: '0 0 8px {colors.fgOverlay20}',
          WebkitTapHighlightColor: 'transparent',
          transition: 'opacity {durations.fast} ease',
          _hover: { opacity: 0.8 },
          _active: { opacity: 0.4 },
        })}
        {...fastClick(() => surfaceRef.current?.dismiss())}
      >
        <CloseIcon size={12} />
        <span className={css({ fontSize: '0.75rem' })}>Clear</span>
      </div>
    </NotificationSurface>
  ) : null
}

Tip.displayName = 'Tip'

export default Tip
