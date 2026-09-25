import { Keyboard } from '@capacitor/keyboard'
import ClipboardJS from 'clipboard'
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../../styled-system/css'
import { extendTapRecipe } from '../../../styled-system/recipes'
import ExportOption from '../../@types/ExportOption'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import Thought from '../../@types/Thought'
import { alertActionCreator as alert } from '../../actions/alert'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { errorActionCreator as error } from '../../actions/error'
import { isIOS, isTouch } from '../../browser'
import { HOME_PATH } from '../../constants'
import download from '../../device/download'
import * as selection from '../../device/selection'
import share from '../../device/share'
import useOnClickOutside from '../../hooks/useOnClickOutside'
import documentSort from '../../selectors/documentSort'
import exportContext, { exportFilter } from '../../selectors/exportContext'
import { getChildrenRanked } from '../../selectors/getChildren'
import getDescendantThoughtIds from '../../selectors/getDescendantThoughtIds'
import hasMulticursor from '../../selectors/hasMulticursor'
import simplifyPath from '../../selectors/simplifyPath'
import theme from '../../selectors/theme'
import ellipsize from '../../util/ellipsize'
import exportPhrase from '../../util/exportPhrase'
import fastClick from '../../util/fastClick'
import head from '../../util/head'
import headValue from '../../util/headValue'
import isCommandKey from '../../util/isCommandKey'
import isRoot from '../../util/isRoot'
import removeHome from '../../util/removeHome'
import timestamp from '../../util/timestamp'
import trimBullet from '../../util/trimBullet'
import Checkbox from './../Checkbox'
import ChevronImg from './../ChevronImg'
import Dropdown from './../Dropdown'
import ModalComponent from './ModalComponent'

/******************************************************************************
 * Types
 *****************************************************************************/

interface AdvancedSetting {
  id: string
  onChange: () => void
  checked: boolean
  title: string
  description: string
  disabled?: boolean
  /** Child settings are indented. */
  child?: boolean
  /** Parent settings have less margin-bottom. */
  parent?: boolean
}

interface ExportDropdownProps {
  selected: ExportOption
  onSelect?: (option: ExportOption) => void
}

/******************************************************************************
 * Constants
 *****************************************************************************/

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
  { type: 'application/json', label: 'JSON Snapshot', extension: 'json' },
]

/******************************************************************************
 * Styles
 *****************************************************************************/

const rotate180Class = css.raw({ transform: 'rotate(180deg)' })

/******************************************************************************
 * Components
 *****************************************************************************/

/** A dropdown menu to select an export type. */
const ExportDropdown: FC<ExportDropdownProps> = ({ selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)

  const dark = useSelector(state => theme(state) !== 'Light')

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dropDownRef = React.useRef<HTMLDivElement>(null)

  // Close the dropdown when clicking outside of it.
  useOnClickOutside(dropDownRef, closeDropdown)

  return (
    <span ref={dropDownRef} className={css({ position: 'relative', whiteSpace: 'nowrap', userSelect: 'none' })}>
      <a className={css({ color: 'fg' })} {...fastClick(() => setIsOpen(!isOpen))}>
        {selected.label}
      </a>
      <span className={css({ display: 'inline-flex', verticalAlign: 'middle' })}>
        <ChevronImg onClickHandle={() => setIsOpen(!isOpen)} cssRaw={isOpen ? rotate180Class : undefined} />
        <span>
          <Dropdown
            isOpen={isOpen}
            selected={selected}
            onSelect={(option: ExportOption) => {
              onSelect?.(option)
              setIsOpen(false)
            }}
            options={exportOptions}
            dark={dark}
          />
        </span>
      </span>
    </span>
  )
}

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport: FC<{ simplePaths: SimplePath[]; exportedState: State }> = ({ simplePaths, exportedState }) => {
  const dispatch = useDispatch()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // Clears the alert ERROR_TIMEOUT after a clipboard error; cancelled by a successful copy. Scoped to this modal instance rather than a global, so it needs no reset between tests.
  const errorTimer = useRef(0)
  const title = isRoot(simplePaths[0]) ? 'home' : (headValue(exportedState, simplePaths[0]) ?? '')
  const titleShort = ellipsize(title)
  // const titleMedium = ellipsize(title, 25)

  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(false)
  const [shouldIncludeArchived, setShouldIncludeArchived] = useState(false)
  const [shouldIncludeMarkdownFormatting, setShouldIncludeMarkdownFormatting] = useState(true)
  const [shouldExportFirstThought, setShouldExportFirstThought] = useState(true)
  const [shouldExportSubthoughts, setShouldExportSubthoughts] = useState(true)
  const [selected, setSelected] = useState(exportOptions[0])
  const exportWord = isTouch ? 'Share' : 'Download'

  // Capture only the selected subtrees in JSON, even though the read snapshot contains the complete document.
  const selectedThoughtIds = useMemo(
    () => [
      ...new Set(simplePaths.flatMap(path => [head(path), ...getDescendantThoughtIds(exportedState, head(path))])),
    ],
    [exportedState, simplePaths],
  )

  const exportContent = useMemo(() => {
    if (selected.type === 'application/json') {
      const thoughtIndexCompact = Object.fromEntries<Partial<Thought>>(
        selectedThoughtIds.map(id => {
          const thought = exportedState.thoughts.thoughtIndex[id]
          // UI overlays and metadata do not belong in the compact document export.
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { created, lastUpdated, updatedBy, generating, displayValue, splitSource, ...partialThought } = thought
          return [id, partialThought]
        }),
      )
      return JSON.stringify(thoughtIndexCompact)
    }

    const sortedPaths = documentSort(exportedState, simplePaths)
    const exportIds = !shouldExportFirstThought
      ? sortedPaths.flatMap(path => getChildrenRanked(exportedState, head(path)).map(child => child.id))
      : sortedPaths.map(path => head(path))
    const exported = exportIds
      .map(thoughtId =>
        exportContext(exportedState, thoughtId, selected.type, {
          excludeArchived: !shouldIncludeArchived,
          excludeMarkdownFormatting: !shouldIncludeMarkdownFormatting,
          excludeMeta: !shouldIncludeMetaAttributes,
          maxDepth: !shouldExportSubthoughts ? 0 : undefined,
        }),
      )
      .join('\n')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/\n+/g, '\n')
    return removeHome(trimBullet(exported)).trimStart()
  }, [
    exportedState,
    selected.type,
    selectedThoughtIds,
    shouldExportFirstThought,
    shouldExportSubthoughts,
    shouldIncludeArchived,
    shouldIncludeMarkdownFormatting,
    shouldIncludeMetaAttributes,
    simplePaths,
  ])

  const numDescendantsFinal =
    selected.type === 'text/plain'
      ? exportContent.split('\n').length - simplePaths.length
      : !shouldExportSubthoughts
        ? 0
        : simplePaths.reduce(
            (count, path) =>
              count +
              getDescendantThoughtIds(exportedState, head(path), {
                filterAndTraverse: thought => shouldIncludeMetaAttributes || thought.value !== '=note',
                filterFunction: exportFilter({
                  excludeArchived: !shouldIncludeArchived,
                  excludeMeta: !shouldIncludeMetaAttributes,
                }),
              }).length,
            0,
          )
  const exportThoughtsPhraseFinal = exportPhrase(
    simplePaths.map(path => head(path)),
    numDescendantsFinal,
    { value: title },
  )

  /** Show an alert and close the modal after the thoughts are copied to the clipboard. */
  const onCopyToClipboard = useCallback(() => {
    // Note: clipboard leaves unwanted text selection after copy operation. so removing it to prevent issue with gesture handler
    selection.clear()

    dispatch([closeModal(), alert(`Copied ${exportThoughtsPhraseFinal} to the clipboard`)])

    clearTimeout(errorTimer.current)
  }, [dispatch, exportThoughtsPhraseFinal])

  useEffect(
    () => {
      const clipboard = new ClipboardJS('[aria-label="copy-clipboard-btn"]')

      clipboard.on('success', onCopyToClipboard)

      clipboard.on('error', e => {
        console.error(e)
        dispatch(error({ value: 'Error copying thoughts' }))

        clearTimeout(errorTimer.current)
        errorTimer.current = window.setTimeout(() => dispatch(alert(null)), 10000)
      })

      return () => {
        clipboard.destroy()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exportThoughtsPhraseFinal],
  )

  /** Copy the exported content on Cmd/Ctrl + C. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (
        e.key === 'c' &&
        isCommandKey(e) &&
        exportContent &&
        // do not override copy shortcut if user has text selected
        selection.isCollapsed() !== false &&
        // textarea selection is not reflected in window.getSelection()
        textareaRef.current?.selectionStart === textareaRef.current?.selectionEnd
      ) {
        e.stopPropagation()
        navigator.clipboard.writeText(exportContent)
        onCopyToClipboard()
      }
    },

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exportContent],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onKeyDown])

  /** Shares or downloads when the export button is clicked. */
  const onExportClick = async () => {
    // On the iOS Capacitor app, the native share sheet can open while the software keyboard is
    // still visible, causing the two to overlap (#4294). Blur the focused editable and dismiss
    // the keyboard before presenting the share sheet. This is done synchronously (no await) so
    // that the user-activation context required by navigator.share() is preserved.
    if (isIOS) {
      selection.clear()
      Keyboard.hide()
    }

    // use the native or mobile share dialog if it is available
    const shared = await share({
      text: exportContent!,
      title: titleShort,
    })

    // otherwise download the data with createObjectURL
    if (!shared) {
      try {
        download(exportContent!, `em-${title}-${timestamp()}.${selected.extension}`, selected.type)
      } catch (err) {
        const e = err as Error
        dispatch(error({ value: e.message }))
        console.error('Download Error', e.message)
      }
    }

    dispatch(closeModal())
  }

  const [advancedSettings, setAdvancedSettings] = useState(false)

  /** Toggles advanced setting when Advanced CTA is clicked. */
  const onAdvancedClick = () => setAdvancedSettings(!advancedSettings)

  /** Updates meta checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeMetaCheckbox = () => {
    if (shouldIncludeMetaAttributes) setShouldIncludeArchived(false)
    setShouldIncludeMetaAttributes(!shouldIncludeMetaAttributes)
  }

  /** Updates archived checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeArchivedCheckbox = () => setShouldIncludeArchived(!shouldIncludeArchived)

  /** Updates archived checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeFormattingCheckbox = () => setShouldIncludeMarkdownFormatting(!shouldIncludeMarkdownFormatting)

  /** Toggles whether the first (top-level) thought is included in the export. */
  const onChangeExportFirstThoughtCheckbox = () => setShouldExportFirstThought(!shouldExportFirstThought)

  /** Toggles whether subthoughts (descendants) are included in the export. */
  const onChangeExportSubthoughtsCheckbox = () => setShouldExportSubthoughts(!shouldExportSubthoughts)

  /** Created an array of objects so that we can just add object here to get multiple checkbox options created. */
  const advancedSettingsArray: AdvancedSetting[] = useMemo(
    () => [
      {
        id: 'exportFirstThought',
        onChange: onChangeExportFirstThoughtCheckbox,
        checked: shouldExportFirstThought,
        title: 'Export first thought',
        description:
          'When checked, the top-level thought is included in the export. When unchecked, the first thought is skipped and only its descendants are exported. When multiple thoughts are selected, the entire first level is skipped.',
      },
      {
        id: 'exportSubthoughts',
        onChange: onChangeExportSubthoughtsCheckbox,
        checked: shouldExportSubthoughts,
        title: 'Export subthoughts',
        description:
          'When checked, all subthoughts are included in the export. When unchecked, only the top-level thoughts are exported without any descendants.',
      },
      {
        id: 'meta',
        onChange: onChangeMetaCheckbox,
        checked: shouldIncludeMetaAttributes,
        title: 'Metaprogramming Attributes',
        description:
          'When checked, include all metaprogramming attributes such pins, table view, etc. Check this option if the text is intended to be pasted back into em. Uncheck this option for social sharing or public display. ',
        parent: true,
      },
      {
        id: 'archived',
        onChange: onChangeArchivedCheckbox,
        checked: shouldIncludeArchived,
        title: 'Archived',
        description: 'When checked, the exported thoughts include archived thoughts.',
        disabled: !shouldIncludeMetaAttributes,
        child: true,
      },
      {
        id: 'formatting',
        onChange: onChangeFormattingCheckbox,
        checked: shouldIncludeMarkdownFormatting,
        title: 'Formatting Characters',
        description:
          'Include **double asterisks** for bold and *single asterisk* for italics. If unchecked, formatting will be lost.',
      },
    ],

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      shouldIncludeArchived,
      shouldIncludeMetaAttributes,
      shouldIncludeMarkdownFormatting,
      shouldExportFirstThought,
      shouldExportSubthoughts,
    ],
  )

  return (
    <ModalComponent id='export' title={isTouch ? 'Share' : 'Export'}>
      {/* Export message */}
      <div
        className={css({
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '10px',
        })}
      >
        <span>
          <span data-testid='export-phrase-container'>
            {exportWord}{' '}
            {
              // JSON exports the selected subtrees as a compact document snapshot.
              selected.type === 'application/json' ? (
                'state'
              ) : (
                <span dangerouslySetInnerHTML={{ __html: exportThoughtsPhraseFinal }} />
              )
            }
            <span>
              {' '}
              as <ExportDropdown selected={selected} onSelect={setSelected} />
            </span>
          </span>
        </span>
      </div>

      {/* Preview */}
      <div className={css({ position: 'relative' })}>
        <textarea
          aria-label='Export preview'
          ref={textareaRef}
          readOnly
          className={css({
            backgroundColor: 'darkgray',
            border: 'none',
            borderRadius: '10px',
            color: 'exportTextareaColor',
            fontSize: '1em',
            height: '120px',
            marginBottom: 'calc(max(1.2em, 20px))',
            width: '300px',
          })}
          value={exportContent || ''}
        ></textarea>
      </div>

      {/* Download button */}
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        })}
      >
        <button
          className={css({
            fontFamily: 'Helvetica',
            textAlign: 'center',
            cursor: 'pointer',
            outline: 'none',
            padding: '2px 30px',
            minWidth: '90px',
            display: 'inline-block',
            borderRadius: '99px',
            margin: '0 5px 15px 5px',
            whiteSpace: 'nowrap',
            lineHeight: 2,
            textDecoration: 'none',
            border: 'none',
            color: 'bg',
            backgroundColor: 'fg',
          })}
          {...fastClick(onExportClick)}
        >
          {exportWord}
        </button>
      </div>

      {/* Copy to clipboard */}
      <div className={css({ marginBottom: '15px', textAlign: 'center' })}>
        <a data-clipboard-text={exportContent} aria-label='copy-clipboard-btn' className={extendTapRecipe()}>
          Copy to clipboard
        </a>
      </div>

      {/* Advanced Settings */}
      <div className={css({ display: 'flex', justifyContent: 'center', marginBottom: '2em' })}>
        <span>
          <a
            className={cx(
              extendTapRecipe(),
              css({
                userSelect: 'none',
                display: 'flex',
                position: 'relative',
                transition: `opacity {durations.veryFast} ease-in-out`,
                color: 'fg',
                opacity: advancedSettings ? 1 : 0.5,
              }),
            )}
            {...fastClick(onAdvancedClick)}
          >
            Advanced
          </a>
        </span>
        <span
          className={css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', position: 'relative' })}
        >
          <ChevronImg
            onClickHandle={onAdvancedClick}
            cssRaw={css.raw(advancedSettings && rotate180Class, { opacity: advancedSettings ? 1 : 0.5 })}
          />
        </span>
      </div>

      {advancedSettings && (
        <div
          className={css({
            display: 'flex',
            justifyContent: 'center',
            margin: '0 auto',
            maxWidth: '34em',
            flexDirection: 'column',
          })}
        >
          {advancedSettingsArray.map(props => (
            <Checkbox key={props.id} {...props}>
              {props.description}
            </Checkbox>
          ))}
        </div>
      )}
    </ModalComponent>
  )
}

/**
 * Captures one immutable document and selection for the lifetime of the export modal.
 */
const ModalExportWrapper = () => {
  const dispatch = useDispatch()
  const [exportedState] = useState<State>(() => dispatch((_, getState) => getState()))
  const simplePaths = useMemo(
    () =>
      hasMulticursor(exportedState)
        ? Object.values(exportedState.multicursors).map(cursor => simplifyPath(exportedState, cursor))
        : [exportedState.cursor ? simplifyPath(exportedState, exportedState.cursor) : HOME_PATH],
    [exportedState],
  )

  // Remove descendants of other paths, sort in document order
  const filteredPaths = useMemo(() => {
    const paths = simplePaths.reduce<SimplePath[]>((acc, cur) => {
      const hasAncestor = acc.some(p => cur.includes(head(p)))
      if (hasAncestor) return acc
      return [...acc.filter(p => !p.includes(head(cur))), cur]
    }, [])

    return paths
  }, [simplePaths])

  return <ModalExport simplePaths={filteredPaths} exportedState={exportedState} />
}

export default ModalExportWrapper
