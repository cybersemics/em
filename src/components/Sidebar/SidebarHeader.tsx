import { ComponentType, Ref } from 'react'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import { isAndroid } from '../../browser'
import fastClick from '../../util/fastClick'
import ChevronImg from '../ChevronImg'
import { useDropdown } from '../Dropdown/Dropdown'
import { SidebarSection, SidebarSectionId } from './sidebarSections'

/** A sidebar section row: icon + label. Used for both the active header and dropdown items. */
const SidebarSectionRow = ({
  icon: Icon,
  label,
  iconSize = 28,
  rowRef,
}: {
  icon: ComponentType<{ size?: number; fill?: string }>
  label: string
  iconSize?: number
  /** The dropdown's anchor point for this section: the element that lands on the header when it's selected. */
  rowRef?: Ref<HTMLDivElement>
}) => (
  <div ref={rowRef} className={css({ display: 'flex', alignItems: 'center', gap: '0.75rem' })}>
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
  /** State setter to toggle the dropdown open/closed. */
  setIsOpen: (open: boolean) => void
}

/**
 * The header for the sidebar, which by default shows the icon and label
 * for the current SidebarSection. It can be tapped to toggle a dropdown
 * view, which shows all SidebarSections.
 */
const SidebarHeader = ({ sections, sectionId, setIsOpen }: SidebarHeaderProps) => {
  /** The currently active section. */
  const section = sections.find(s => s.id === sectionId)!

  /** Open state, timing, and the selected row's offset all come from the enclosing Dropdown (see Sidebar). */
  const { isOpen, timing, transition, registerRow, registerAnchorPoint, selectedTravel, select, close } = useDropdown()

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
            transition: `opacity ${timing.content}s ${isOpen ? 'ease-out' : 'linear'} ${isOpen ? 0 : timing.content}s`,
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
        style={{ opacity: isOpen ? 1 : 0, transition: transition(['opacity']) }}
        {...fastClick(close)}
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
              ref={registerRow(s.id)}
              style={{
                // The selected row stays visible and slides into the header; other rows fade.
                ...(isSelected ? selectedTravel : { transition: transition(['opacity', 'transform']) }),
                opacity: isSelected ? 1 : isOpen ? 1 : 0,
                // Android: keep each row promoted to avoid fast-switch flicker.
                willChange: isAndroid ? 'transform, opacity' : undefined,
              }}
            >
              <div
                data-testid={`sidebar-${s.id}`}
                {...fastClick(() => select(s.id))}
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
                <SidebarSectionRow icon={s.icon} label={s.label} iconSize={28} rowRef={registerAnchorPoint(s.id)} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SidebarHeader
