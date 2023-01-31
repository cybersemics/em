import ClipboardJS from 'clipboard'
import { and } from 'fp-and-or'
import _ from 'lodash'
import React, { FC, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import useOnClickOutside from 'use-onclickoutside'
import Context from '../@types/Context'
import ExportOption from '../@types/ExportOption'
import ModalType from '../@types/Modal'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import alert from '../action-creators/alert'
import closeModal from '../action-creators/closeModal'
import error from '../action-creators/error'
import pull from '../action-creators/pull'
import { isTouch } from '../browser'
import { AlertType, HOME_PATH } from '../constants'
import download from '../device/download'
import * as selection from '../device/selection'
import globals from '../globals'
import contextToThoughtId from '../selectors/contextToThoughtId'
import exportContext from '../selectors/exportContext'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import theme from '../selectors/theme'
import themeColors from '../selectors/themeColors'
import ellipsize from '../util/ellipsize'
import exportPhrase from '../util/exportPhrase'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import pathToContext from '../util/pathToContext'
import removeHome from '../util/removeHome'
import timestamp from '../util/timestamp'
import CheckboxItem from './CheckboxItem'
import ChevronImg from './ChevronImg'
import DropDownMenu from './DropDownMenu'
import LoadingEllipsis from './LoadingEllipsis'
import Modal from './Modal'

/** Use a throttled callback. */
// https://stackoverflow.com/a/62017005/480608
function useThrottle(cb: any, delay: number) {
  const options = { leading: true, trailing: false } // add custom lodash options
  const cbRef = useRef(cb)
  // use mutable ref to make useCallback/throttle not depend on `cb` dep
  useEffect(() => {
    cbRef.current = cb
  })
  return useCallback(
    _.throttle((...args) => cbRef.current(...args), delay, options),
    [delay],
  )
}

/******************************************************************************
 * Contexts
 *****************************************************************************/

const PullStatusContext = createContext<boolean>(false)
PullStatusContext.displayName = 'PullStatusContext'

const DescendantNumberContext = createContext<number | null>(null)
DescendantNumberContext.displayName = 'DescendantNumberContext'

/******************************************************************************
 * Context Providers
 *****************************************************************************/

/**
 * Context to handle pull status and number of descendants.
 */
const PullProvider: FC<{ context: Context }> = ({ children, context }) => {
  const [isPulling, setIsPulling] = useState<boolean>(true)
  // Update numDescendantsUnthrottled as descendants are pulled.
  // Copy numDescendantsUnthrottled over to numDescendants every 100ms to throttle re-renders.
  // This results in a ~10% decrease in pull time on 6k thoughts.
  // There are only marginal performance gains at delays above 100ms, and steeply diminishing gains below 100ms.
  const [numDescendantsUnthrottled, setNumDescendantsUnthrottled] = useState<number | null>(null)
  const [numDescendants, setNumDescendants] = useState<number | null>(null)
  const updateNumDescendantsThrottled = useThrottle(() => setNumDescendants(numDescendantsUnthrottled), 100)

  const dispatch = useDispatch()
  const isMounted = useRef(false)
  const store = useStore()

  /** Handle new thoughts pulled. */
  const onThoughts = useCallback((thoughts: ThoughtIndices) => {
    if (!isMounted.current) return
    // count the total number of new children pulled
    const numDescendantsNew = Object.values(thoughts.thoughtIndex).reduce((accum, thought) => {
      return accum + Object.keys(thought.childrenMap).length
    }, 0)

    // do not update numDescendants directly, since this callback has a high throughput
    // instead, set numDescendantsUnthrottled and copy them over to numDescendants every 100ms with updateNumDescendantsThrottled
    setNumDescendantsUnthrottled(numDescendantsUnthrottled => (numDescendantsUnthrottled ?? 0) + numDescendantsNew)
    updateNumDescendantsThrottled()
  }, [])

  // fetch all pending descendants of the cursor once for all components
  // track isMounted so we can cancel the end trigger after unmount
  useEffect(() => {
    if (isMounted.current) return

    isMounted.current = true

    const id = contextToThoughtId(store.getState(), context)

    if (id) {
      dispatch(
        pull([id], {
          onLocalThoughts: onThoughts,
          // TODO: onRemoteThoughts ??
          maxDepth: Infinity,
        }),
      ).then(() => {
        // isMounted will be set back to false on unmount, preventing exportContext from unnecessarily being called after the component has unmounted
        if (isMounted.current) {
          setIsPulling(false)
        }
      })
    }

    return () => {
      isMounted.current = false
    }
  }, [])

  return (
    <PullStatusContext.Provider value={isPulling}>
      <DescendantNumberContext.Provider value={numDescendants}>{children}</DescendantNumberContext.Provider>
    </PullStatusContext.Provider>
  )
}

/******************************************************************************
 * Hooks
 *****************************************************************************/

/**
 * Use the pulling status of export.
 */
const usePullStatus = () => useContext(PullStatusContext)

/**
 * Use number of descendants that will be exported.
 */
const useDescendantsNumber = () => useContext(DescendantNumberContext)

interface AdvancedSetting {
  id: string
  onChangeFunc: () => void
  checked: boolean
  title: string
  description: string
  dim?: boolean
  indent?: boolean
}

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
  { type: 'application/json', label: 'JSON Snapshot', extension: 'json' },
]

/******************************************************************************
 * ExportThoughtsPhrase component
 *****************************************************************************/

interface ExportThoughtsPhraseOptions {
  id: ThoughtId
  // the final number of descendants
  numDescendantsFinal: number | null
  title: string
}

/** A user-friendly phrase describing how many thoughts will be exported. Updated with an estimate as thoughts are pulled. */
const ExportThoughtsPhrase = ({ id, numDescendantsFinal, title }: ExportThoughtsPhraseOptions) => {
  const store = useStore()
  const state = store.getState()

  // updates with latest number of descendants
  const numDescendants = useDescendantsNumber()
  const n = numDescendantsFinal ?? numDescendants

  const exportThoughtsPhrase =
    numDescendantsFinal || numDescendants
      ? exportPhrase(state, id, n, { value: title })
      : n === 0 || n === 1
      ? '1 thought'
      : 'thoughts'

  return <span dangerouslySetInnerHTML={{ __html: exportThoughtsPhrase }} />
}

/******************************************************************************
 * ExportDropdown component
 *****************************************************************************/

interface ExportDropdownProps {
  selected: ExportOption
  onSelect?: (option: ExportOption) => void
}

/** A dropdown menu to select an export type. */
const ExportDropdown: FC<ExportDropdownProps> = ({ selected, onSelect }) => {
  const store = useStore()
  const state = store.getState()
  const [isOpen, setIsOpen] = useState(false)

  const dark = theme(state) !== 'Light'
  const colors = useSelector(themeColors)

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dropDownRef = React.useRef<HTMLDivElement>(null)
  useOnClickOutside(dropDownRef, closeDropdown)

  return (
    <span ref={dropDownRef} style={{ position: 'relative', whiteSpace: 'nowrap', userSelect: 'none' }}>
      <a style={{ color: colors.fg }} onClick={() => setIsOpen(!isOpen)}>
        {selected.label}
      </a>
      <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}>
        <ChevronImg dark={dark} onClickHandle={() => setIsOpen(!isOpen)} className={isOpen ? 'rotate180' : ''} />
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
            style={{
              top: '120%',
              left: 0, // position on the left edge of "Plain Text", otherwise the left side gets cut off on mobile
              display: 'table', // the only value that seems to overflow properly within the inline-flex element
              padding: 0,
            }}
          />
        </span>
      </span>
    </span>
  )
}

/******************************************************************************
 * ModalExport component
 *****************************************************************************/

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport: FC<{ simplePath: SimplePath; cursor: Path }> = ({ simplePath, cursor }) => {
  const store = useStore()
  const dispatch = useDispatch()
  const state = store.getState()
  const context = pathToContext(state, simplePath)
  const id = head(simplePath)
  const titleId = findDescendant(state, id, ['=publish', 'Title'])
  const titleChild = getAllChildrenAsThoughts(state, titleId)[0]
  const cursorThought = getThoughtById(state, head(cursor))
  const title = isRoot(cursor) ? 'home' : titleChild ? titleChild.value : cursorThought.value
  const titleShort = ellipsize(title)
  // const titleMedium = ellipsize(title, 25)

  const [exportContent, setExportContent] = useState<string | null>(null)
  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(false)
  const [shouldIncludeArchived, setShouldIncludeArchived] = useState(false)
  const [shouldIncludeMarkdownFormatting, setShouldIncludeMarkdownFormatting] = useState(true)
  const [selected, setSelected] = useState(exportOptions[0])
  const [numDescendantsInState, setNumDescendantsInState] = useState<number | null>(null)

  const dark = theme(state) !== 'Light'
  const colors = useSelector(themeColors)
  const exportWord = isTouch ? 'Share' : 'Download'

  const isPulling = usePullStatus()

  // calculate the final number of descendants
  // uses a different method for text/plain and text/html
  // does not update in real-time (See: ExportThoughtsPhrase component)
  const numDescendants = exportContent
    ? selected.type === 'text/plain'
      ? exportContent.split('\n').length - 1
      : numDescendantsInState ?? 0
    : null
  const exportThoughtsPhrase = exportPhrase(state, id, numDescendants, {
    value: title,
  })

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  const setExportContentFromCursor = () => {
    const state = store.getState()
    const exported =
      selected.type === 'application/json'
        ? JSON.stringify(state.thoughts, null, 2)
        : exportContext(state, context, selected.type, {
            title: titleChild ? titleChild.value : undefined,
            excludeMeta: !shouldIncludeMetaAttributes,
            excludeArchived: !shouldIncludeArchived,
            excludeMarkdownFormatting: !shouldIncludeMarkdownFormatting,
          })

    setExportContent(titleChild ? exported : removeHome(exported).trimStart())
  }

  // Sets export content when pull is complete by useDescendants
  useEffect(() => {
    if (!isPulling) setExportContentFromCursor()
  }, [isPulling])

  useEffect(() => {
    if (!shouldIncludeMetaAttributes) setShouldIncludeArchived(false)

    // when exporting HTML, we have to do a full traversal since the numDescendants heuristic of counting the number of lines in the exported content does not work
    if (selected.type === 'text/html') {
      setNumDescendantsInState(
        getDescendantThoughtIds(state, id, {
          filterFunction: and(
            shouldIncludeMetaAttributes || ((thought: Thought) => !isAttribute(thought.value)),
            shouldIncludeArchived || ((thought: Thought) => thought.value !== '=archive'),
          ),
        }).length,
      )
    }

    if (!isPulling) {
      setExportContentFromCursor()
    }
  }, [selected, shouldIncludeMetaAttributes, shouldIncludeArchived, shouldIncludeMarkdownFormatting])

  useEffect(() => {
    const clipboard = new ClipboardJS('.copy-clipboard-btn')

    clipboard.on('success', () => {
      // Note: clipboard leaves unwanted text selection after copy operation. so removing it to prevent issue with gesture handler
      selection.clear()

      dispatch([
        closeModal(),
        alert(`Copied ${exportThoughtsPhrase} to the clipboard`, {
          alertType: AlertType.Clipboard,
          clearDelay: 3000,
        }),
      ])

      clearTimeout(globals.errorTimer)
    })

    clipboard.on('error', e => {
      console.error(e)
      dispatch(error({ value: 'Error copying thoughts' }))

      clearTimeout(globals.errorTimer)
      globals.errorTimer = window.setTimeout(() => dispatch(alert(null, { alertType: AlertType.Clipboard })), 10000)
    })

    return () => {
      clipboard.destroy()
    }
  }, [exportThoughtsPhrase])

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
      } catch (e) {
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

  //   // eslint-disable-next-line fp/no-loops
  //   for await (const result of ipfs.add(exported)) {
  //     if (result && result.path) {
  //       const cid = result.path
  //       // TODO: prependRevision is currently broken
  //       // dispatch(prependRevision({ path: cursor, cid }))
  //       cids.push(cid) // eslint-disable-line fp/no-mutating-methods
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
  const advancedSettingsArray: AdvancedSetting[] = [
    {
      id: 'meta',
      onChangeFunc: onChangeMetaCheckbox,
      checked: shouldIncludeMetaAttributes,
      title: 'Metaprogramming Attributes',
      description:
        'When checked, include all metaprogramming attributes such pins, table view, etc. Check this option if the text is intended to be pasted back into em. Uncheck this option for social sharing or public display. ',
    },
    {
      id: 'archived',
      onChangeFunc: onChangeArchivedCheckbox,
      checked: shouldIncludeArchived,
      title: 'Archived',
      description: 'When checked, the exported thoughts include archived thoughts.',
      dim: !shouldIncludeMetaAttributes,
      indent: true,
    },
    {
      id: 'formatting',
      onChangeFunc: onChangeFormattingCheckbox,
      checked: shouldIncludeMarkdownFormatting,
      title: 'Formatting Characters',
      description:
        'Include **double asteriskss** for bold and *single asterisks* for italics. If unchecked, formatting will be lost.',
    },
  ]

  return (
    <Modal id={ModalType.export} title={isTouch ? 'Share' : 'Export'} className='popup'>
      {/* Export message */}
      <div className='modal-export-wrapper'>
        <span className='modal-content-to-export'>
          <span>
            {exportWord}{' '}
            {
              // application/json will ignore the cursor and downlaod the raw thought state as-is
              selected.type === 'application/json' ? (
                'state'
              ) : (
                <ExportThoughtsPhrase id={id} numDescendantsFinal={numDescendants} title={title} />
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
      <textarea
        readOnly
        style={{
          backgroundColor: '#111',
          border: 'none',
          borderRadius: '10px',
          color: '#aaa',
          fontSize: '1em',
          height: '120px',
          marginBottom: '20px',
          width: '300px',
        }}
        value={exportContent || ''}
      ></textarea>

      {/* Download button */}
      <div className='modal-export-btns-wrapper'>
        <button
          className='modal-btn-export'
          disabled={exportContent === null}
          onClick={onExportClick}
          style={{ color: colors.bg, backgroundColor: colors.fg }}
        >
          {exportWord}
        </button>
      </div>

      {/* Copy to clipboard */}
      <div className='cp-clipboard-wrapper'>
        {exportContent !== null ? (
          <a data-clipboard-text={exportContent} className='copy-clipboard-btn'>
            Copy to clipboard
          </a>
        ) : (
          <LoadingEllipsis />
        )}
      </div>

      {/* Advanced Settings */}
      <div className='advance-setting-wrapper'>
        <span>
          <a
            className='advance-setting-link no-select'
            onClick={onAdvancedClick}
            style={{ opacity: advancedSettings ? 1 : 0.5 }}
          >
            Advanced
          </a>
        </span>
        <span className='advance-setting-chevron'>
          <ChevronImg
            dark={dark}
            onClickHandle={onAdvancedClick}
            className={advancedSettings ? 'rotate180' : ''}
            additonalStyle={{ opacity: advancedSettings ? 1 : 0.5 }}
          />
        </span>
      </div>

      {advancedSettings && (
        <div className='advance-setting-section'>
          {advancedSettingsArray.map(({ checked, description, dim, id, indent, onChangeFunc, title }) => (
            <div key={id}>
              <CheckboxItem
                checked={checked}
                description={description}
                dim={dim}
                indent={indent}
                onChange={onChangeFunc}
                title={title}
              />
            </div>
          ))}
        </div>
      )}

      {/* Publish */}

      {/* isDocumentEditable() && (
        <>
          <div className='modal-export-publish'>
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
                <p className='dim'>
                  <i>
                    Note: These thoughts are published permanently. <br />
                    This action cannot be undone.
                  </i>
                </p>
              </div>
            )}
          </div>

          <div className='modal-export-btns-wrapper'>
            <button
              className='modal-btn-export'
              disabled={!exportContent || publishing || publishedCIDs.length > 0}
              onClick={publish}
              style={{ color: colors.bg, backgroundColor: colors.fg }}
            >
              Publish
            </button>

            {(publishing || publishedCIDs.length > 0) && (
              <button
                className='modal-btn-cancel'
                onClick={() => {
                  dispatch([alert(null), closeModal()])
                }}
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
    </Modal>
  )
}

/**
 * ModalExport with necessary provider.
 */
const ModalExportWrapper = () => {
  const store = useStore()
  const state = store.getState()
  const cursor = useSelector((state: State) => state.cursor || HOME_PATH)
  const simplePath = simplifyPath(state, cursor)
  const context = pathToContext(state, simplePath)

  return (
    <PullProvider context={context}>
      <ModalExport simplePath={simplePath} cursor={cursor} />
    </PullProvider>
  )
}

export default ModalExportWrapper
