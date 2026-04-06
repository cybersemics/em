import { FC, PropsWithChildren, useState } from 'react'
import { SwitchTransition } from 'react-transition-group'
import { css, cva, cx } from '../../styled-system/css'
import { modalTextRecipe } from '../../styled-system/recipes'
import Command from '../@types/Command'
import CommandSortType from '../@types/CommandSortType'
import { CommandViewType } from '../@types/CommandViewType'
import { isTouch } from '../browser'
import { commandById, globalCommands } from '../commands'
import { COMMAND_GROUPS } from '../constants'
import useFilteredCommands from '../hooks/useFilteredCommands'
import conjunction from '../util/conjunction'
import keyValueBy from '../util/keyValueBy'
import CommandsGroup from './CommandsGroup'
import FadeTransition from './FadeTransition'
import SearchCommands from './SearchCommands'
import SortButton from './SortButton'

// assert that groups include all necessary commands
const commandsGroupedMap = keyValueBy(
  COMMAND_GROUPS.flatMap(level => level.groups.flatMap(group => group.commands)),
  true,
)
const commandsUngrouped = globalCommands.filter(
  command => !commandsGroupedMap[command.id] && !command.hideFromHelp && (isTouch ? command.gesture : command.keyboard),
)
if (commandsUngrouped.length > 0) {
  throw new Error(
    `CommandTable groups are missing command(s). Please add ${conjunction(
      commandsUngrouped.map(command => command.id),
    )} to the appropriate group in COMMAND_GROUPS (constants.ts), or add hideFromHelp: true to the Command.`,
  )
}

// Calculate commands at load-time for the various display types and sort orders.
// We filter out commands and groups that are not available on the current platform.
// TODO: Currently, CommandTable uses a constant value COMMAND_GROUPS as the source of
// truth for commands. This needs to change to address #2863.

/* Commands grouped by difficulty level and type. Current platform only. */
const commandsGroupedByType = COMMAND_GROUPS.map(level => ({
  title: level.title,
  groups: level.groups
    .map(group => ({
      title: group.title,
      commands: group.commands.map(commandById).filter(command => (isTouch ? command.gesture : command.keyboard)),
    }))
    .filter(group => group.commands.length > 0),
})).filter(level => level.groups.length > 0)

/* Commands sorted by label, A-Z. Current platform only. */
const commandsSortedByLabel = COMMAND_GROUPS.flatMap(level => level.groups.flatMap(group => group.commands))
  .map(commandById)
  .filter(command => (isTouch ? command.gesture : command.keyboard))
  .sort((a, b) => a.label.localeCompare(b.label))

interface CommandTableProps {
  customize?: boolean
  onSelect?: (command: Command | null) => void
  selectedCommand?: Command
  viewType?: 'table' | 'grid'
}

interface CommandTableContentProps extends CommandTableProps {
  search: string
  commands: Command[]
  sortOrder: CommandSortType
  isMobileGestures: boolean
}

/** Renders a difficulty level heading with its child category groups. */
const CommandDifficultyGroup: FC<PropsWithChildren<{ title: string; viewType?: CommandViewType }>> = ({
  title,
  viewType,
  children,
}) => {
  const modalClasses = modalTextRecipe()

  return (
    <div>
      <h2
        className={cx(
          modalClasses.subtitle,
          css({
            fontSize: '1.2em',
            marginTop: '1.2em',
            marginBottom: '0.2em',
            ...(viewType === 'grid' && {
              fontSize: '1.4rem',
              borderBottom: 'none',
              position: 'sticky',
              top: '-1.333rem',
              background: 'linear-gradient(to bottom, {colors.bg} 85%, transparent)',
              padding: '0.622rem 0',
              zIndex: 1,
            }),
          }),
        )}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

/** Renders the content of the command table.
 * It renders groups of commands if the search is empty.
 * It renders a single command if the search is not empty.
 *
 * Depending on the viewType prop, it renders the commands in a table or a grid.
 */
const CommandTableContent = ({
  search,
  commands,
  selectedCommand,
  customize,
  onSelect,
  viewType = 'table',
  sortOrder,
  isMobileGestures,
}: CommandTableContentProps) => {
  if (search) {
    /* Show command search results */
    return (
      <CommandsGroup
        title={'Results'}
        commands={commands}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        search={search}
        viewType={viewType}
        isMobileGestures={isMobileGestures}
      />
    )
  } else if (sortOrder === 'type') {
    /* Show commands grouped by difficulty level and type */
    return commandsGroupedByType.map(level => (
      <CommandDifficultyGroup key={level.title} title={level.title} viewType={viewType}>
        {level.groups.map(group => (
          <CommandsGroup
            title={group.title}
            commands={group.commands}
            customize={customize}
            key={group.title}
            onSelect={onSelect}
            selectedCommand={selectedCommand}
            viewType={viewType}
            isMobileGestures={isMobileGestures}
          />
        ))}
      </CommandDifficultyGroup>
    ))
  } else {
    /* All commands sorted by label, A-Z */
    return (
      <CommandsGroup
        title={'All Commands'}
        commands={commandsSortedByLabel}
        selectedCommand={selectedCommand}
        customize={customize}
        onSelect={onSelect}
        viewType={viewType}
        isMobileGestures={isMobileGestures}
      />
    )
  }
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
const CommandTable = ({ customize, onSelect, selectedCommand, viewType = 'table' }: CommandTableProps) => {
  const [search, setSearch] = useState('')
  const commands = useFilteredCommands(search, { platformCommandsOnly: true })
  const [sortOrder, setSortOrder] = useState<CommandSortType>('type')
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
        {viewType !== 'grid' && (
          <MobileGestureToggle isMobileGestures={isMobileGestures} setIsMobileGestures={setIsMobileGestures} />
        )}
      </div>

      <SwitchTransition>
        <FadeTransition key={`${sortOrder}-${search}`} in={true} type='medium' unmountOnExit>
          <CommandTableContent
            search={search}
            commands={commands}
            selectedCommand={selectedCommand}
            customize={customize}
            onSelect={onSelect}
            viewType={viewType}
            sortOrder={sortOrder}
            isMobileGestures={isMobileGestures}
          />
        </FadeTransition>
      </SwitchTransition>
    </div>
  )
}

export default CommandTable
