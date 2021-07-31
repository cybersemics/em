import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { and } from 'fp-and-or'
import Emitter from 'emitter20'
import ClipboardJS from 'clipboard'
import globals from '../globals'
import { HOME_PATH } from '../constants'
import {
  download,
  ellipsize,
  exportPhrase,
  getPublishUrl,
  hashContext,
  headValue,
  isDocumentEditable,
  isFunction,
  isRoot,
  pathToContext,
  removeHome,
  timestamp,
  unroot,
} from '../util'
import { alert, error, closeModal, pull } from '../action-creators'
import { exportContext, getAllChildren, getDescendants, simplifyPath, theme } from '../selectors'
import Modal from './Modal'
import DropDownMenu from './DropDownMenu'
import LoadingEllipsis from './LoadingEllipsis'
import ChevronImg from './ChevronImg'
import { isTouch } from '../browser'
import useOnClickOutside from 'use-onclickoutside'
import { Child, Context, ExportOption, State, ThoughtsInterface } from '../@types'

interface AdvancedSetting {
  id: string
  onChangeFunc: () => void
  defaultChecked: boolean
  checked: boolean
  title: string
  description: string
}

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

/******************************************************************************
 * Hooks
 *****************************************************************************/

/** Use all descendants of a context. Only pulls descendants once per mount.
 *
 * @returns An object like: { isFetched, emitter<'thoughtsLocal' | 'thoughtsRemote' | 'end'> }.
 **/
const useDescendants = (context: Context) => {
  const dispatch = useDispatch()
  const isMounted = useRef(false)
  const isFetched = useRef(false)
  const emitter = new Emitter()

  // fetch all pending descendants of the cursor once for all components
  // track isMounted so we can cancel the end trigger after unmount
  useEffect(() => {
    if (isMounted.current) return

    isMounted.current = true
    dispatch(
      pull(
        { [hashContext(context)]: context },
        {
          onLocalThoughts: (thoughts: ThoughtsInterface) => emitter.trigger('thoughtsLocal', thoughts),
          onRemoteThoughts: (thoughts: ThoughtsInterface) => emitter.trigger('thoughtsRemote', thoughts),
          maxDepth: Infinity,
        },
      ),
    ).then(() => {
      isFetched.current = true
      // isMounted will be set back to false on unmount, preventing exportContext from unnecessarily being called after the component has unmounted
      if (isMounted.current) {
        emitter.trigger('end')
      }
    })

    return () => {
      isMounted.current = false
    }
  }, [])

  return {
    isFetched,
    emitter,
  }
}

/******************************************************************************
 * ExportThoughtsPhrase component
 *****************************************************************************/

interface ExportThoughtsPhraseOptions {
  context: Context
  // the final number of descendants
  numDescendantsFinal: number | null
  // an event handler registrant that fires whenever more thoughts are pulled
  // used instead of a prop to avoid parent re-renders
  descendantsEmitter: {
    on: (eventName: 'thoughtsLocal', handler: (thoughts: ThoughtsInterface) => void) => void
    off: (eventName: 'thoughtsLocal', handler: (thoughts: ThoughtsInterface) => void) => void
  }
  title: string
}

/** A user-friendly phrase describing how many thoughts will be exported. Updated with an estimate as thoughts are pulled. */
const ExportThoughtsPhrase = ({
  context,
  numDescendantsFinal,
  descendantsEmitter,
  title,
}: ExportThoughtsPhraseOptions) => {
  const store = useStore()
  const state = store.getState()

  // update numDescendants as descendants are pulled
  const [numDescendants, setNumDescendants] = useState<number | null>(null)

  /** Handle new thoughts pulled. */
  const onThoughts = useCallback(
    (thoughts: ThoughtsInterface) => {
      // count the total number of new children pulled
      const numDescendantsNew = Object.values(thoughts.contextIndex).reduce((accum, parent) => {
        return accum + parent.children.length
      }, 0)
      setNumDescendants((numDescendants ?? 0) + numDescendantsNew)
    },
    [numDescendants],
  )

  useEffect(() => {
    descendantsEmitter.on('thoughtsLocal', onThoughts)
    return () => {
      descendantsEmitter.off('thoughtsLocal', onThoughts)
    }
  }, [numDescendants])

  const exportThoughtsPhrase = exportPhrase(state, context, numDescendantsFinal ?? numDescendants ?? 0, {
    value: title,
  })
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
  // const [wrapperRef, setWrapper] = useState<HTMLElement | null>(null)

  const dark = theme(state) !== 'Light'
  const themeColor = { color: dark ? 'white' : 'black' }

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dropDownRef = React.useRef<HTMLDivElement>(null)
  useOnClickOutside(dropDownRef, closeDropdown)

  return (
    <span ref={dropDownRef} style={{ position: 'relative', whiteSpace: 'nowrap', userSelect: 'none' }}>
      <a style={themeColor} onClick={() => setIsOpen(!isOpen)}>
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
const ModalExport = () => {
  const store = useStore()
  const dispatch = useDispatch()
  const state = store.getState()
  const cursor = useSelector((state: State) => state.cursor || HOME_PATH)
  const simplePath = simplifyPath(state, cursor)
  const context = pathToContext(simplePath)
  const contextTitle = unroot(context.concat(['=publish', 'Title']))
  const titleChild = getAllChildren(state, contextTitle)[0]
  const title = isRoot(cursor) ? 'home' : titleChild ? titleChild.value : headValue(cursor)
  const titleShort = ellipsize(title)
  const titleMedium = ellipsize(title, 25)

  const [exportContent, setExportContent] = useState<string | null>(null)
  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(true)
  const [shouldIncludeArchived, setShouldIncludeArchived] = useState(true)
  const [selected, setSelected] = useState(exportOptions[0])
  const [numDescendantsInState, setNumDescendantsInState] = useState<number | null>(null)

  const dark = theme(state) !== 'Light'
  const themeColor = { color: dark ? 'white' : 'black' }
  const themeColorWithBackground = dark
    ? { color: 'black', backgroundColor: 'white' }
    : { color: 'white', backgroundColor: 'black' }

  const exportWord = isTouch ? 'Share' : 'Download'

  // calculate the final number of descendants
  // uses a different method for text/plain and text/html
  // does not update in real-time (See: ExportThoughtsPhrase component)
  const numDescendants = exportContent
    ? selected.type === 'text/plain'
      ? exportContent.split('\n').length - 1
      : numDescendantsInState ?? 0
    : null
  const exportThoughtsPhrase = exportPhrase(state, context, numDescendants, {
    value: title,
  })

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  const setExportContentFromCursor = () => {
    const exported = exportContext(store.getState(), context, selected.type, {
      title: titleChild ? titleChild.value : undefined,
      excludeMeta: !shouldIncludeMetaAttributes,
      excludeArchived: !shouldIncludeArchived,
    })

    setExportContent(titleChild ? exported : removeHome(exported).trimStart())
  }

  // get an event emitter to pass to the ExportThoughtsPhrase component so that it can calculate the number of descendants in real-time as thoughts are pulled
  // otherwise ModalExport will run its render logic every time a new batch of thoughts get pulled
  const { isFetched, emitter: descendantsEmitter } = useDescendants(context)

  useEffect(() => {
    descendantsEmitter.on('end', setExportContentFromCursor)
    return () => {
      descendantsEmitter.off('end', setExportContentFromCursor)
    }
  }, [])

  useEffect(() => {
    if (!shouldIncludeMetaAttributes) setShouldIncludeArchived(false)

    // when exporting HTML, we have to do a full traversal since the numDescendants heuristic of counting the number of lines in the exported content does not work
    if (selected.type === 'text/html') {
      setNumDescendantsInState(
        getDescendants(state, simplePath, {
          filterFunction: and(
            shouldIncludeMetaAttributes || ((child: Child) => !isFunction(child.value)),
            shouldIncludeArchived || ((child: Child) => child.value !== '=archive'),
          ),
        }).length,
      )
    }

    // only re-export if inputs change and descendants have already been fetched
    if (isFetched.current) {
      setExportContentFromCursor()
    }
  }, [selected, shouldIncludeMetaAttributes, shouldIncludeArchived])

  useEffect(() => {
    const clipboard = new ClipboardJS('.copy-clipboard-btn')

    clipboard.on('success', () => {
      // Note: clipboard leaves unwanted text selection after copy operation. so removing it to prevent issue with gesture handler
      if (document.getSelection()?.toString()) document.getSelection()?.removeAllRanges()

      dispatch([
        closeModal(),
        alert(`Copied ${exportThoughtsPhrase} to the clipboard`, { alertType: 'clipboard', clearTimeout: 3000 }),
      ])

      clearTimeout(globals.errorTimer)
    })

    clipboard.on('error', e => {
      console.error(e)
      dispatch(error({ value: 'Error copying thoughts' }))

      clearTimeout(globals.errorTimer)
      globals.errorTimer = window.setTimeout(() => dispatch(alert(null, { alertType: 'clipboard' })), 10000)
    })

    return () => {
      clipboard.destroy()
    }
  }, [exportThoughtsPhrase])

  const [publishing, setPublishing] = useState(false)
  const [publishedCIDs, setPublishedCIDs] = useState([] as string[])

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
  const publish = async () => {
    setPublishing(true)
    setPublishedCIDs([])
    const cids = []

    const { default: IpfsHttpClient } = await import('ipfs-http-client')
    const ipfs = IpfsHttpClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

    // export without =src content
    const exported = exportContext(store.getState(), context, selected.type, {
      excludeSrc: true,
      excludeMeta: !shouldIncludeMetaAttributes,
      excludeArchived: !shouldIncludeArchived,
      title: titleChild ? titleChild.value : undefined,
    })

    // eslint-disable-next-line fp/no-loops
    for await (const result of ipfs.add(exported)) {
      if (result && result.path) {
        const cid = result.path
        // TODO: prependRevision is currently broken
        // dispatch(prependRevision({ path: cursor, cid }))
        cids.push(cid) // eslint-disable-line fp/no-mutating-methods
        setPublishedCIDs(cids)
      } else {
        setPublishing(false)
        setPublishedCIDs([])
        dispatch(error({ value: 'Publish Error' }))
        console.error('Publish Error', result)
      }
    }

    setPublishing(false)
  }

  const [advancedSettings, setAdvancedSettings] = useState(false)

  /** Toggles advanced setting when Advanced CTA is clicked. */
  const onAdvancedClick = () => setAdvancedSettings(!advancedSettings)

  /** Updates lossless checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeLosslessCheckbox = () => setShouldIncludeMetaAttributes(!shouldIncludeMetaAttributes)

  /** Updates archived checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeArchivedCheckbox = () => setShouldIncludeArchived(!shouldIncludeArchived)

  /** Created an array of objects so that we can just add object here to get multiple checkbox options created. */
  const advancedSettingsArray: AdvancedSetting[] = [
    {
      id: 'lossless-checkbox',
      onChangeFunc: onChangeLosslessCheckbox,
      defaultChecked: true,
      checked: shouldIncludeMetaAttributes,
      title: 'Lossless',
      description:
        'When checked, include all metaprogramming attributes such as archived thoughts, pins, table view, etc. Check this option for a backup-quality export that can be re-imported with no data loss. Uncheck this option for social sharing or exporting to platforms that do not support em metaprogramming attributes. Which is, uh, all of them.',
    },
    {
      id: 'archived-checkbox',
      onChangeFunc: onChangeArchivedCheckbox,
      defaultChecked: true,
      checked: shouldIncludeArchived,
      title: 'Archived',
      description: 'When checked, the exported thoughts include archived thoughts.',
    },
  ]

  return (
    <Modal id='export' title='Export' className='popup'>
      {/* Export message */}
      <div className='modal-export-wrapper'>
        <span className='modal-content-to-export'>
          <span>
            {exportWord}{' '}
            <ExportThoughtsPhrase
              context={context}
              numDescendantsFinal={numDescendants}
              descendantsEmitter={descendantsEmitter}
              title={title}
            />
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
          style={themeColorWithBackground}
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
          {advancedSettingsArray.map(({ id, onChangeFunc, defaultChecked, checked, title, description }) => {
            return (
              <label className='checkbox-container' key={`${id}-key-${title}`}>
                <div>
                  <p className='advance-setting-label'>{title}</p>
                  <p className='advance-setting-description dim'>{description}</p>
                </div>
                <input
                  type='checkbox'
                  id={id}
                  checked={checked}
                  onChange={onChangeFunc}
                  defaultChecked={defaultChecked}
                />
                <span className='checkmark'></span>
              </label>
            )
          })}
        </div>
      )}

      {/* Publish */}

      {isDocumentEditable() && (
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
              style={themeColorWithBackground}
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
                  fontSize: '14px',
                  ...themeColor,
                }}
              >
                Close
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  )
}

export default ModalExport
