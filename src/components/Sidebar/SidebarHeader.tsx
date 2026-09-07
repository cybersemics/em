import { ComponentType, useCallback, useMemo, useRef } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { isAndroid } from '../../browser'
import fastClick from '../../util/fastClick'
import ChevronImg from '../ChevronImg'
import { MEDIUM_DURATION, cssEaseOut } from './constants'
import { SidebarSection, SidebarSectionId } from './sidebarSections'

/** A sidebar section row: icon + label. Used for both the active header and dropdown items. */
const SidebarSectionRow = ({
  icon: Icon,
  label,
  iconSize = 28,
}: {
  icon: ComponentType<{ size?: number; fill?: string }>
  label: string
  iconSize?: number
}) => (
  <div className={css({ display: 'flex', alignItems: 'center', gap: '0.75rem' })}>
    <div
      className={css({
        width: '36px',
        height: '36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      })}
    >
      <Icon size={iconSize} fill={token('colors.fgOverlay75')} />
    </div>
    <div
      className={css({
        color: 'fgOverlay75',
        fontSize: '1.4rem',
        lineHeight: '1.4rem',
        letterSpacing: '-0.25px',
        marginTop: 4,
        fontWeight: 300,
      })}
    >
      {label}
    </div>
  </div>
)

/** Props for the SidebarHeader component. */
interface SidebarHeaderProps {
  /** All available sidebar sections. */
  sections: SidebarSection[]
  /** The currently active section. */
  sectionId: SidebarSectionId
  /** Callback when user selects a different section. */
  onSectionChange: (id: SidebarSectionId) => void
  /** Whether the dropdown is currently expanded. */
  isOpen: boolean
  /** State setter to toggle the dropdown open/closed. */
  setIsOpen: (open: boolean) => void
}

/**
 * The header for the sidebar, which by default shows the icon and label
 * for the current SidebarSection. It can be tapped to toggle a dropdown
 * view, which shows all SidebarSections.
 */
const SidebarHeader = ({ sections, sectionId, onSectionChange, isOpen, setIsOpen }: SidebarHeaderProps) => {
  /** The currently active section. */
  const section = sections.find(s => s.id === sectionId)!

  /** Refs to each dropdown item's inner div, keyed by section id. Used by getSelectedOffset
   * below to measure where the selected row currently sits, which determines how far the
   * selected item must translate up to land on the header row. */
  const itemEls = useRef<Record<string, HTMLDivElement | null>>({})

  /** Distance the selected row must move to become the closed header. A transformed wrapper can
   * become offsetParent, so include its offset only when offsetTop does not already contain it. */
  const getSelectedOffset = useCallback(() => {
    const inner = itemEls.current[sectionId]
    const sectionRow = inner?.firstElementChild as HTMLElement | null
    const motionDiv = inner?.parentElement as HTMLElement | null
    if (sectionRow && motionDiv) {
      const includesMotionDivOffset = sectionRow.offsetParent !== motionDiv
      return sectionRow.offsetTop + (includesMotionDivOffset ? 0 : motionDiv.offsetTop)
    }
    // If the elements aren't mounted yet, estimate based on index * row height
    const idx = sections.findIndex(s => s.id === sectionId)
    return Math.max(0, idx) * 54
  }, [sectionId, sections])

  // Measure only when the dropdown or section changes; offsetTop forces layout.
  const selectedOffset = useMemo(getSelectedOffset, [getSelectedOffset, isOpen])

  return (
    // position:relative creates a stacking context for the absolutely-positioned dropdown.
    // this allows the dropdown's options to appear above the header without affecting the header's layout.
    <div
      data-testid='sidebar-section-picker'
      {...fastClick(() => setIsOpen(!isOpen))}
      className={css({ position: 'relative', cursor: 'pointer' })}
    >
      <div
        className={css({
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
        })}
      >
        {/* Reserve space for the selected dropdown row, which slides here when closed. */}
        <div style={{ visibility: 'hidden' }} aria-hidden>
          <SidebarSectionRow icon={section.icon} label={section.label} />
        </div>
        {/* Fade out on open; wait for the selected row to settle before fading back in. */}
        <div
          style={{
            opacity: isOpen ? 0 : 1,
            transition: `opacity ${MEDIUM_DURATION}s ${isOpen ? 'ease-out' : 'linear'} ${isOpen ? 0 : MEDIUM_DURATION}s`,
            willChange: isAndroid ? 'opacity' : undefined, // Android: avoid opacity-transition flicker.
          }}
          className={css({ display: 'inline-flex', paddingTop: '0.375rem' })}
        >
          <ChevronImg
            onClickHandle={() => setIsOpen(!isOpen)}
            additonalStyle={{
              opacity: 0.4,
            }}
          />
        </div>
      </div>

      {/* Dismiss the dropdown when the area behind it is clicked. */}
      <div
        style={{ opacity: isOpen ? 1 : 0, transition: `opacity ${MEDIUM_DURATION}s ${cssEaseOut}` }}
        {...fastClick(() => setIsOpen(false))}
        className={css({
          position: 'absolute',
          zIndex: 1,
          top: '100%',
          left: 0,
          right: 0,
          height: '100vh',
          cursor: 'pointer',
          pointerEvents: isOpen ? 'auto' : 'none',
        })}
      />

      {/* Dropdown sections in display order. */}
      <div
        // Android: isolate the dropdown rows to avoid compositing flicker.
        style={{ willChange: isAndroid ? 'transform' : undefined }}
        className={css({
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          margin: 0,
          width: '100%',
          pointerEvents: isOpen ? 'auto' : 'none',
        })}
      >
        {sections.map((s, i) => {
          const isSelected = s.id === sectionId
          return (
            <div
              key={s.id}
              style={{
                // The selected row stays visible and slides into the header; other rows fade.
                opacity: isSelected ? 1 : isOpen ? 1 : 0,
                transform: `translateY(${isSelected && !isOpen ? -selectedOffset : 0}px)`,
                transition: `opacity ${MEDIUM_DURATION}s ${cssEaseOut}, transform ${MEDIUM_DURATION}s ${cssEaseOut}`,
                // Android: keep each row promoted to avoid fast-switch flicker.
                willChange: isAndroid ? 'transform, opacity' : undefined,
              }}
            >
              <div
                ref={(el: HTMLDivElement | null) => {
                  itemEls.current[s.id] = el
                }}
                data-testid={`sidebar-${s.id}`}
                {...fastClick(() => {
                  onSectionChange(s.id)
                  setIsOpen(false)
                })}
                className={css({
                  cursor: 'pointer',
                  paddingTop: i === 0 ? 0 : '0.5rem',
                  paddingBottom: '0.5rem',
                  display: 'flex',
                  opacity: isSelected ? 1 : 0.6,
                  '@media (hover: hover)': { _hover: { opacity: 1 } },
                  '@media (hover: none)': { _active: { opacity: 1 } },
                  transition: 'opacity {durations.fast} ease-out',
                  // Android: promote before the active-state fade to avoid a one-frame blank.
                  willChange: isAndroid ? 'opacity' : undefined,
                })}
              >
                {/* All section icons render at the same size (28, the header size) so nothing
                    resizes when the dropdown opens or the selection changes. */}
                <SidebarSectionRow icon={s.icon} label={s.label} iconSize={28} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SidebarHeader
