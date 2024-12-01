import ClipboardJS from 'clipboard'
import React, {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useDispatch, useSelector } from 'react-redux'
import useOnClickOutside from 'use-onclickoutside'
import { css, cx } from '../../../styled-system/css'
import { extendTap } from '../../../styled-system/recipes'
import ExportOption from '../../@types/ExportOption'
import SimplePath from '../../@types/SimplePath'
import State from '../../@types/State'
import Thought from '../../@types/Thought'
import ThoughtId from '../../@types/ThoughtId'
import { alertActionCreator as alert } from '../../actions/alert'
import { closeModalActionCreator as closeModal } from '../../actions/closeModal'
import { errorActionCreator as error } from '../../actions/error'
import { isMac, isTouch } from '../../browser'
import { AlertType, HOME_PATH, HOME_TOKEN } from '../../constants'
import replicateTree from '../../data-providers/data-helpers/replicateTree'
import download from '../../device/download'
import * as selection from '../../device/selection'
import globals from '../../globals'
import documentSort from '../../selectors/documentSort'
import exportContext, { exportFilter } from '../../selectors/exportContext'
import getDescendantThoughtIds from '../../selectors/getDescendantThoughtIds'
import hasMulticursor from '../../selectors/hasMulticursor'
import simplifyPath from '../../selectors/simplifyPath'
import theme from '../../selectors/theme'
import ellipsize from '../../util/ellipsize'
import equalPath from '../../util/equalPath'
import exportPhrase from '../../util/exportPhrase'
import fastClick from '../../util/fastClick'
import head from '../../util/head'
import headValue from '../../util/headValue'
import initialState from '../../util/initialState'
import isRoot from '../../util/isRoot'
import removeHome from '../../util/removeHome'
import throttleConcat from '../../util/throttleConcat'
import timestamp from '../../util/timestamp'
import Checkbox from './../Checkbox'
import ChevronImg from './../ChevronImg'
import DropDownMenu from './../DropDownMenu'
import LoadingEllipsis from './../LoadingEllipsis'
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

interface ExportThoughtsPhraseOptions {
  ids: ThoughtId | ThoughtId[]
  excludeArchived: boolean
  excludeMeta: boolean
  /** The final number of descendants. */
  numDescendantsFinal: number | null
  title: string
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
 * Contexts
 *****************************************************************************/

const PullStatusContext = createContext<boolean>(false)
PullStatusContext.displayName = 'PullStatusContext'

/** Use the pulling status of export. */
const usePullStatus = () => useContext(PullStatusContext)

const ExportingThoughtsContext = createContext<Thought[]>([])
ExportingThoughtsContext.displayName = 'ExportingThoughtsContext'

/** A hook that returns a list of all exported thoughts updated in real-time. Used to calculate numDesendants with different settings without having to re-traverse all descendants. */
const useExportingThoughts = () => useContext(ExportingThoughtsContext)

const ExportedStateContext = createContext<State | null>(null)
ExportedStateContext.displayName = 'ExportedStateContext'

/** Use the exported state. */
const useExportedState = () => useContext(ExportedStateContext)

/******************************************************************************
 * Context Providers
 *****************************************************************************/

/**
 * Context to handle pull status and number of descendants.
 */
const PullProvider: FC<PropsWithChildren<{ simplePaths: SimplePath[] }>> = ({ children, simplePaths }) => {
  const isMounted = useRef(false)
  const [isPulling, setIsPulling] = useState<boolean>(true)
  const [exportedState, setExportedState] = useState<State | null>(null)
  // list of thoughts as they are exported to provide accurate numDescendants count in real-time (throttled)
  const [exportingThoughts, setExportingThoughts] = useState<Thought[]>([])
  // Update exportingThoughts every 100ms to throttle re-renders.
  // This results in a ~10% decrease in pull time on 6k thoughts.
  // There are only marginal performance gains at delays above 100ms, and steeply diminishing gains below 100ms.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setExportingThoughtsThrottled = useCallback(
    throttleConcat((queue: Thought[]) => setExportingThoughts(thoughtsOld => [...thoughtsOld, ...queue]), 100),
    [],
  )

  // fetch all pending descendants of the cursor once for all components
  // track isMounted so we can cancel the end trigger after unmount
  useEffect(
    () => {
      isMounted.current = true

      const replications = simplePaths.map(simplePath => {
        const id = head(simplePath)

        return replicateTree(id, {
          // TODO: Warn the user if offline or not fully replicated
          remote: false,
          onThought: thought => {
            if (!isMounted.current) return
            setExportingThoughtsThrottled(thought)
          },
        })
      })

      Promise.all(replications.map(replication => replication.promise)).then(thoughtIndices => {
        if (!isMounted.current) return

        setExportingThoughtsThrottled.flush()

        const initial = initialState()
        const exportedState: State = {
          ...initial,
          thoughts: {
            ...initial.thoughts,
            thoughtIndex: Object.assign({}, initial.thoughts.thoughtIndex, ...thoughtIndices),
          },
        }

        setExportedState(exportedState)
        setIsPulling(false)
      })

      return () => {
        isMounted.current = false
        replications.forEach(replication => replication.cancel())
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <PullStatusContext.Provider value={isPulling}>
      <ExportedStateContext.Provider value={exportedState}>
        <ExportingThoughtsContext.Provider value={exportingThoughts}>{children}</ExportingThoughtsContext.Provider>
      </ExportedStateContext.Provider>
    </PullStatusContext.Provider>
  )
}

/******************************************************************************
 * Styles
 *****************************************************************************/

const rotate180Class = css.raw({ transform: 'rotate(180deg)' })

/******************************************************************************
 * Components
 *****************************************************************************/

/** A user-friendly phrase describing how many thoughts will be exported. Updated with an estimate as thoughts are pulled. */
const ExportThoughtsPhrase = ({
  ids,
  excludeArchived,
  excludeMeta,
  numDescendantsFinal,
  title,
}: ExportThoughtsPhraseOptions) => {
  const thoughts = useExportingThoughts()
  const thoughtsFiltered = thoughts.filter(
    exportFilter({
      excludeMeta,
      excludeArchived,
    }),
  )
  const numDescendants = thoughtsFiltered.length + (thoughtsFiltered[0]?.id === HOME_TOKEN ? -1 : 0)

  // updates with latest number of descendants
  const n = numDescendantsFinal ?? numDescendants

  const phrase =
    numDescendantsFinal || numDescendants || ids.length > 1
      ? exportPhrase(ids, n, { value: title })
      : n === 0 || n === 1
        ? '1 thought'
        : 'thoughts'

  return <span dangerouslySetInnerHTML={{ __html: phrase }} />
}

/** A dropdown menu to select an export type. */
const ExportDropdown: FC<ExportDropdownProps> = ({ selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false)

  const dark = useSelector(state => theme(state) !== 'Light')

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dropDownRef = React.useRef<HTMLDivElement>(null)
  useOnClickOutside(dropDownRef, closeDropdown)

  return (
    <span ref={dropDownRef} className={css({ position: 'relative', whiteSpace: 'nowrap', userSelect: 'none' })}>
      <a className={css({ color: 'fg' })} {...fastClick(() => setIsOpen(!isOpen))}>
        {selected.label}
      </a>
      <span className={css({ display: 'inline-flex', verticalAlign: 'middle' })}>
        <ChevronImg onClickHandle={() => setIsOpen(!isOpen)} cssRaw={isOpen ? rotate180Class : undefined} />
        <span>
          <DropDownMenu
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
const ModalExport: FC<{ simplePaths: SimplePath[] }> = ({ simplePaths }) => {
  const dispatch = useDispatch()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const id = head(simplePaths[0])
  const title = useSelector(state => (isRoot(simplePaths[0]) ? 'home' : headValue(state, simplePaths[0])))
  const titleShort = ellipsize(title)
  // const titleMedium = ellipsize(title, 25)

  const [exportContent, setExportContent] = useState<string | null>(null)
  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(false)
  const [shouldIncludeArchived, setShouldIncludeArchived] = useState(false)
  const [shouldIncludeMarkdownFormatting, setShouldIncludeMarkdownFormatting] = useState(true)
  const [selected, setSelected] = useState(exportOptions[0])
  const [numDescendantsInState, setNumDescendantsInState] = useState<number | null>(null)

  const exportWord = isTouch ? 'Share' : 'Download'

  const isPulling = usePullStatus()
  const exportedState = useExportedState()

  // calculate the final number of descendants
  // uses a different method for text/plain and text/html
  // does not update in real-time (See: ExportThoughtsPhrase component)
  const numDescendantsFinal = exportContent
    ? selected.type === 'text/plain'
      ? exportContent.split('\n').length - simplePaths.length
      : (numDescendantsInState ?? 0)
    : null

  const exportThoughtsPhraseFinal = useSelector(() =>
    exportPhrase(
      simplePaths.map(simplePath => head(simplePath)),
      numDescendantsFinal,
      { value: title },
    ),
  )

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  const setExportContentFromCursor = () => {
    if (!exportedState) return

    if (selected.type === 'application/json') {
      setExportContent(JSON.stringify(exportedState.thoughts, null, 2))
    } else {
      // Sort in document order. At this point, all thoughts are pulled and in state.
      const sortedPaths = documentSort(exportedState, simplePaths)

      const exported = sortedPaths
        .map(simplePath =>
          exportContext(exportedState, head(simplePath), selected.type, {
            excludeArchived: !shouldIncludeArchived,
            excludeMarkdownFormatting: !shouldIncludeMarkdownFormatting,
            excludeMeta: !shouldIncludeMetaAttributes,
          }),
        )
        .join('\n')
        // Collapse contiguous <ul> tags.
        .replace(/<\/ul>\s*<ul>/g, '')
        // Clear empty lines
        .replace(/\n+/g, '\n')

      setExportContent(removeHome(exported).trimStart())
    }
  }

  /** Show an alert and close the modal after the thoughts are copied to the clipboard. */
  const onCopyToClipboard = useCallback(() => {
    // Note: clipboard leaves unwanted text selection after copy operation. so removing it to prevent issue with gesture handler
    selection.clear()

    dispatch([
      closeModal(),
      alert(`Copied ${exportThoughtsPhraseFinal} to the clipboard`, {
        alertType: AlertType.Clipboard,
        clearDelay: 3000,
      }),
    ])

    clearTimeout(globals.errorTimer)
  }, [dispatch, exportThoughtsPhraseFinal])

  // Sets export content when pull is complete by useDescendants
  useEffect(
    () => {
      if (!isPulling) setExportContentFromCursor()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPulling],
  )

  useEffect(
    () => {
      if (!shouldIncludeMetaAttributes) setShouldIncludeArchived(false)

      // when exporting HTML, we have to do a full traversal since the numDescendants heuristic of counting the number of lines in the exported content does not work
      if (selected.type === 'text/html' && exportedState) {
        setNumDescendantsInState(
          getDescendantThoughtIds(exportedState, id, {
            filterAndTraverse: thought => shouldIncludeMetaAttributes || thought.value !== '=note',
            filterFunction: exportFilter({
              excludeArchived: !shouldIncludeArchived,
              excludeMeta: !shouldIncludeMetaAttributes,
            }),
          }).length,
        )
      }

      if (!isPulling) {
        setExportContentFromCursor()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, shouldIncludeMetaAttributes, shouldIncludeArchived, shouldIncludeMarkdownFormatting],
  )

  useEffect(
    () => {
      const clipboard = new ClipboardJS('[aria-label="copy-clipboard-btn"]')

      clipboard.on('success', onCopyToClipboard)

      clipboard.on('error', e => {
        console.error(e)
        dispatch(error({ value: 'Error copying thoughts' }))

        clearTimeout(globals.errorTimer)
        globals.errorTimer = window.setTimeout(() => dispatch(alert(null, { alertType: AlertType.Clipboard })), 10000)
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
        (isMac ? e.metaKey : e.ctrlKey) &&
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

  // const [publishing, setPublishing] = useState(false)
  // const [publishedCIDs, setPublishedCIDs] = useState([] as string[])

  /** Shares or downloads when the export button is clicked. */
  const onExportClick = () => {
    // use mobile share if it is available
    if (navigator.share) {
      navigator.share({
        text: exportContent!,
        title: titleShort,
      })
    }
    // otherwise download the data with createObjectURL
    else {
      try {
        download(exportContent!, `em-${title}-${timestamp()}.${selected.extension}`, selected.type)
      } catch (e: any) {
        dispatch(error({ value: e.message }))
        console.error('Download Error', e.message)
      }
    }

    dispatch(closeModal())
  }

  /** Publishes the thoughts to IPFS. */
  // const publish = async () => {
  //   setPublishing(true)
  //   setPublishedCIDs([])
  //   const cids = []

  //   const { default: IpfsHttpClient } = await import('ipfs-http-client')
  //   const ipfs = IpfsHttpClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

  //   // export without =src content
  //   const exported = exportContext(store.getState(), context, selected.type, {
  //     excludeSrc: true,
  //     excludeMeta: !shouldIncludeMetaAttributes,
  //     excludeArchived: !shouldIncludeArchived,
  //     excludeMarkdownFormatting: !shouldIncludeMarkdownFormatting,
  //     title: titleChild ? titleChild.value : undefined,
  //   })

  //   for await (const result of ipfs.add(exported)) {
  //     if (result && result.path) {
  //       const cid = result.path
  //       // TODO: prependRevision is currently broken
  //       // dispatch(prependRevision({ path: cursor, cid }))
  //       cids.push(cid)
  //       setPublishedCIDs(cids)
  //     } else {
  //       setPublishing(false)
  //       setPublishedCIDs([])
  //       dispatch(error({ value: 'Publish Error' }))
  //       console.error('Publish Error', result)
  //     }
  //   }

  //   setPublishing(false)
  // }

  const [advancedSettings, setAdvancedSettings] = useState(false)

  /** Toggles advanced setting when Advanced CTA is clicked. */
  const onAdvancedClick = () => setAdvancedSettings(!advancedSettings)

  /** Updates meta checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeMetaCheckbox = () => setShouldIncludeMetaAttributes(!shouldIncludeMetaAttributes)

  /** Updates archived checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeArchivedCheckbox = () => setShouldIncludeArchived(!shouldIncludeArchived)

  /** Updates archived checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeFormattingCheckbox = () => setShouldIncludeMarkdownFormatting(!shouldIncludeMarkdownFormatting)

  /** Created an array of objects so that we can just add object here to get multiple checkbox options created. */
  const advancedSettingsArray: AdvancedSetting[] = useMemo(
    () => [
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
          'Include **double asteriskss** for bold and *single asterisks* for italics. If unchecked, formatting will be lost.',
      },
    ],

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shouldIncludeArchived, shouldIncludeMetaAttributes, shouldIncludeMarkdownFormatting],
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
          <span>
            {exportWord}{' '}
            {
              // application/json will ignore the cursor and downlaod the raw thought state as-is
              selected.type === 'application/json' ? (
                'state'
              ) : (
                <ExportThoughtsPhrase
                  ids={simplePaths.map(simplePath => head(simplePath))}
                  excludeArchived={!shouldIncludeArchived}
                  excludeMeta={!shouldIncludeMetaAttributes}
                  numDescendantsFinal={numDescendantsFinal}
                  title={title}
                />
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
        {exportContent === null && (
          <div className={css({ position: 'absolute', top: 'calc(50% - 1em)', textAlign: 'center', width: ' 100%' })}>
            <LoadingEllipsis />
          </div>
        )}
        <textarea
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
          disabled={exportContent === null}
          {...fastClick(onExportClick)}
        >
          {exportWord}
        </button>
      </div>

      {/* Copy to clipboard */}
      <div className={css({ marginBottom: '15px', textAlign: 'center' })}>
        {exportContent !== null && (
          <a data-clipboard-text={exportContent} aria-label='copy-clipboard-btn' className={extendTap()}>
            Copy to clipboard
          </a>
        )}
      </div>

      {/* Advanced Settings */}
      <div className={css({ display: 'flex', justifyContent: 'center', marginBottom: '2em' })}>
        <span>
          <a
            className={cx(
              extendTap(),
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

      {/* Publish */}

      {/* isDocumentEditable() && (
        <>
          <div className={css({
            borderTop: "solid 1px {colors.modalExportUnused}",
            marginTop: "30px",
            marginBottom: "20px",
            paddingTop: "40px",
            textAlign: "center"
          })}>
            {publishedCIDs.length > 0 ? (
              <div>
                Published:{' '}
                {publishedCIDs.map(cid => (
                  <a
                    key={cid}
                    target='_blank'
                    rel='noopener noreferrer'
                    href={getPublishUrl(cid)}
                    dangerouslySetInnerHTML={{ __html: titleMedium }}
                  />
                ))}
              </div>
            ) : (
              <div>
                <p>
                  {publishing ? (
                    'Publishing...'
                  ) : (
                    <span>
                      Publish <span dangerouslySetInnerHTML={{ __html: exportThoughtsPhrase }} />.
                    </span>
                  )}
                </p>
                <p className={css({color: 'dim'})}>
                  <i>
                    Note: These thoughts are published permanently. <br />
                    This action cannot be undone.
                  </i>
                </p>
              </div>
            )}
          </div>

          <div className={css({
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
              })}
              disabled={!exportContent || publishing || publishedCIDs.length > 0}
              {...fastClick(publish))}
              style={{ color: colors.bg, backgroundColor: colors.fg }}
            >
              Publish
            </button>

            {(publishing || publishedCIDs.length > 0) && (
              <button
                className={css({
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                  background: "none"
                })}
                {...fastClick(()) => {
                  dispatch([alert(null), closeModal()])
                })}
                style={{
                  color: colors.fg,
                  fontSize: '14px',
                }}
              >
                Close
              </button>
            )}
          </div>
        </>
      ) */}
    </ModalComponent>
  )
}

/**
 * Export component wrapped with pull provider.
 */
const ModalExportWrapper = () => {
  const simplePaths = useSelector(
    state =>
      hasMulticursor(state)
        ? Object.values(state.multicursors).map(cursor => simplifyPath(state, cursor))
        : [state.cursor ? simplifyPath(state, state.cursor) : HOME_PATH],
    (a, b) => a.length === b.length && a.every((p, i) => equalPath(p, b[i])),
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

  return (
    <PullProvider simplePaths={filteredPaths}>
      <ModalExport simplePaths={filteredPaths} />
    </PullProvider>
  )
}

export default ModalExportWrapper
