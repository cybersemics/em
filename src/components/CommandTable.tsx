import { useState } from 'react'
import { SwitchTransition } from 'react-transition-group'
import { css, cva } from '../../styled-system/css'
import Command from '../@types/Command'
import { isTouch } from '../browser'
import useCommandList from '../hooks/useCommandList'
import CommandsGroup from './CommandsGroup'
import FadeTransition from './FadeTransition'
import SearchCommands from './SearchCommands'
import SortButton from './SortButton'

interface CommandTableProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
}

const toggleButton = cva({
  base: {
    all: 'unset',
    cursor: 'pointer',
    WebkitTextStrokeWidth: 0,
  },
  variants: {
    active: {
      true: {
        WebkitTextStrokeWidth: '0.06em',
      },
    },
  },
})

/** Renders a toggle button for switching viewing gesture and keyboard commands. */
const MobileGestureToggle = ({
  isMobileGestures,
  setIsMobileGestures,
}: {
  /** The state of the toggle, managed externally. */
  isMobileGestures: boolean
  /** Callback that is called when the toggle state changes. */
  setIsMobileGestures: (value: boolean) => void
}) => {
  return (
    <div className={css({ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78em', paddingLeft: 5 })}>
      <button className={toggleButton({ active: isMobileGestures })} onClick={() => setIsMobileGestures(true)}>
        Gestures
      </button>
      |
      <button className={toggleButton({ active: !isMobileGestures })} onClick={() => setIsMobileGestures(false)}>
        Keyboard
      </button>
    </div>
  )
}

/** Renders a table of commands with a fade-in animation when sorting changes. */
const CommandTable = ({ customize, onSelect, selectedCommand }: CommandTableProps) => {
  const { search, setSearch, sortOrder, setSortOrder, groups } = useCommandList()
  const [isMobileGestures, setIsMobileGestures] = useState(isTouch)

  return (
    <div>
      <div
        className={css({
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: '5px',
          position: 'relative',
          zIndex: 1,
        })}
      >
        <SearchCommands onInput={setSearch} />
        <SortButton onSortChange={setSortOrder} />
        <MobileGestureToggle isMobileGestures={isMobileGestures} setIsMobileGestures={setIsMobileGestures} />
      </div>

      <SwitchTransition>
        <FadeTransition key={`${sortOrder}-${search}`} in={true} type='medium' unmountOnExit>
          <div>
            {groups.map(group => (
              <CommandsGroup
                title={group.title}
                commands={group.commands}
                customize={customize}
                key={group.title}
                onSelect={onSelect}
                selectedCommand={selectedCommand}
                isMobileGestures={isMobileGestures}
                search={search}
              />
            ))}
          </div>
        </FadeTransition>
      </SwitchTransition>
    </div>
  )
}

export default CommandTable
