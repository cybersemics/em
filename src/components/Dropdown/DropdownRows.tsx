// PROTOTYPE — visual experiment only, not for merge.
//
// DropdownRows: the menu itself — an optional heading, the selectable items, then a separator and
// one-shot actions. Typography and opacities from the em design file (Figma node 14593:170852).
// Position, timing and motion all come from the enclosing Dropdown.
//
// Design dials: type and spacing read --sort-dropdown-* custom properties set by DropdownDebugPanel, with the
// current design values as fallbacks. Bake a tuned value by editing its fallback.
import { ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { css } from '../../../styled-system/css'
import useBreakpoint from '../../hooks/useBreakpoint'
import { useDropdown } from './Dropdown'

/** A selectable option. The selected one sits on the anchor. */
export interface DropdownItem<T extends string> {
  id: T
  label: string
  icon: ComponentType<{ size: number }>
}

/** A one-shot action below the separator. Never selected; never sits on the anchor. */
export interface DropdownAction {
  id: string
  label: string
  icon: ComponentType<{ size: number }>
  onAction: () => void
}

interface DropdownRowsProps<T extends string> {
  heading?: string
  items: DropdownItem<T>[]
  actions?: DropdownAction[]
  /** Size of each item's icon box, matching the anchor so the hand-off is seamless (px). */
  iconSize: number
}

/** Vertical padding of each row. With a 28px icon, 4px gives the design's 36px row pitch. */
const ROW_PAD = 'var(--sort-dropdown-row-padding, 4px)'
/** Row padding below md (the Command Universe's mobile layout), tuned on a 393px phone. */
const ROW_PAD_MOBILE = 'var(--sort-dropdown-row-padding, 2.5px)'

const rowClass = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--sort-dropdown-label-icon-gap, 10px)',
  cursor: 'pointer',
  fontFamily: 'radioCanada',
  // Tuned separately per layout: 15.5px on a 393px phone, 17px on desktop.
  fontSize: { base: 'var(--sort-dropdown-font-size, 15.5px)', md: 'var(--sort-dropdown-font-size, 17px)' },
  lineHeight: '1.5',
  letterSpacing: '-0.011em',
  color: 'white',
})

const iconBoxClass = css({ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' })

const DropdownRows = <T extends string>({ heading, items, actions = [], iconSize }: DropdownRowsProps<T>) => {
  const {
    isOpen,
    placement,
    selectedId,
    selectedTravel,
    menuStyle,
    rowMotion,
    transition,
    menuRef,
    registerRow,
    registerAnchorPoint,
    select,
    close,
    stopPress,
  } = useDropdown()
  const rowPad = useBreakpoint('md') ? ROW_PAD : ROW_PAD_MOBILE

  return createPortal(
    // plus-lighter on the whole column adds its white text onto the light below (Figma "linear dodge"), so the
    // labels take their tint from the light rather than from a colour of their own.
    <div
      ref={menuRef}
      onClick={e => e.stopPropagation()}
      {...stopPress}
      className={css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', whiteSpace: 'nowrap' })}
      style={{ ...menuStyle, mixBlendMode: 'plus-lighter' }}
    >
      {heading && (
        <div
          ref={registerRow('heading')}
          className={css({
            display: 'flex',
            alignItems: 'center',
            gap: '11px',
            fontFamily: 'radioCanada',
            fontSize: 'var(--sort-dropdown-heading-font-size, 17.5px)',
            fontWeight: 500,
            lineHeight: '1.5',
            letterSpacing: '-0.011em',
            color: 'white',
          })}
          style={{ paddingBottom: 'var(--sort-dropdown-heading-gap, 6px)', ...rowMotion('heading') }}
        >
          {/* Figma Line 47: 99px, white fading out to the left, 32%. */}
          <div
            style={{
              width: 99,
              height: 1,
              opacity: 0.32,
              background: 'linear-gradient(to left, white, rgba(255, 255, 255, 0))',
            }}
          />
          <span style={{ opacity: 0.65 }}>{heading}</span>
        </div>
      )}

      {items.map(({ id, label, icon: Icon }) => {
        const isSelected = id === selectedId
        return (
          <div
            key={id}
            ref={registerRow(id)}
            onClick={() => select(id)}
            className={rowClass}
            style={{
              paddingBlock: rowPad,
              // 'around': the selected row never moves within the menu; the menu's position carries it onto the anchor.
              // 'down': the menu stays put and the selected row travels between its place and the anchor.
              ...(isSelected
                ? placement === 'down'
                  ? selectedTravel
                  : { transition: transition(['opacity']) }
                : rowMotion(id)),
            }}
          >
            {/* Selected 60%, others 34% (Figma row opacities). */}
            <span style={{ opacity: isOpen ? (isSelected ? 0.6 : 0.34) : 0, transition: transition(['opacity']) }}>
              {label}
            </span>
            <div
              ref={registerAnchorPoint(id)}
              className={iconBoxClass}
              style={{
                width: iconSize,
                height: iconSize,
                // Closed, matches the anchor glyph's 50%.
                opacity: isOpen ? (isSelected ? 0.72 : 0.41) : 0.5,
                transition: transition(['opacity']),
              }}
            >
              <Icon size={iconSize} />
            </div>
          </div>
        )
      })}

      {actions.length > 0 && (
        <>
          <div
            ref={registerRow('separator')}
            style={{
              width: '100%',
              height: 1,
              marginBlock: 'var(--sort-dropdown-separator-space, 8px)',
              background: 'linear-gradient(to left, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0))',
              ...rowMotion('separator'),
            }}
          />
          {actions.map(({ id, label, icon: Icon, onAction }) => (
            <div
              key={id}
              ref={registerRow(id)}
              onClick={() => {
                close()
                onAction()
              }}
              className={rowClass}
              style={{ paddingBlock: rowPad, ...rowMotion(id) }}
            >
              <span style={{ opacity: 0.34 }}>{label}</span>
              <div className={iconBoxClass} style={{ width: iconSize, height: iconSize, opacity: 0.4 }}>
                <Icon size={iconSize * 0.85} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>,
    document.body,
  )
}

export default DropdownRows
