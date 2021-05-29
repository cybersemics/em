import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import ClipboardJS from 'clipboard'
import globals from '../globals'
import { HOME_PATH } from '../constants'
import { download, ellipsize, getPublishUrl, hashContext, headValue, isDocumentEditable, isFunction, isRoot, pathToContext, removeHome, timestamp, unroot } from '../util'
import { alert, error, modalRemindMeLater, pull } from '../action-creators'
import { exportContext, getDescendants, getAllChildren, simplifyPath, theme } from '../selectors'
import Modal from './Modal'
import DropDownMenu from './DropDownMenu'
import LoadingEllipsis from './LoadingEllipsis'
import ChevronImg from './ChevronImg'
import { State } from '../util/initialState'
import { ExportOption } from '../types'
import DetectUserDevice from '../hooks/detectUserDevice'
import useOnClickOutside from 'use-onclickoutside'

interface AdvancedSetting {
  id: string,
  onChangeFunc: () => void,
  defaultChecked: boolean,
  title: string,
  description: string,
}

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport = () => {

  const store = useStore()
  const dispatch = useDispatch()
  const isMounted = useRef(false)
  const state = store.getState()
  const cursor = useSelector((state: State) => state.cursor || HOME_PATH)
  const simplePath = simplifyPath(state, cursor)
  const context = pathToContext(simplePath)
  const contextTitle = unroot(context.concat(['=publish', 'Title']))
  const titleChild = getAllChildren(state, contextTitle)[0]
  const title = isRoot(cursor) ? 'home'
    : titleChild ? titleChild.value
    : headValue(cursor)
  const titleShort = ellipsize(title)
  const titleMedium = ellipsize(title, 25)

  const [selected, setSelected] = useState(exportOptions[0])
  const [isOpen, setIsOpen] = useState(false)
  const [wrapperRef, setWrapper] = useState<HTMLElement | null>(null)
  const [exportContent, setExportContent] = useState<string | null>(null)
  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(true)

  const dark = theme(state) !== 'Light'
  const themeColor = { color: dark ? 'white' : 'black' }
  const themeColorWithBackground = dark
    ? { color: 'black', backgroundColor: 'white' }
    : { color: 'white', backgroundColor: 'black' }

  const numDescendants = getDescendants(state, simplePath, {
    filterFunction: !shouldIncludeMetaAttributes ? child => !isFunction(child.value) : undefined
  }).length

  const { isMobile } = DetectUserDevice()
  const exportWord = isMobile ? 'Share' : 'Download'

  const exportThoughtsPhrase = isRoot(cursor)
    ? ` all ${numDescendants} thoughts`
    : `"${titleShort}"${numDescendants > 0 ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}`

  const exportMessage = <span>
    {exportWord} <span dangerouslySetInnerHTML={{ __html: exportThoughtsPhrase }}/>
    <span> as <a style={themeColor} onClick={() => setIsOpen(!isOpen)}>{selected.label}</a></span>
    .
  </span>
  const publishMessage = <span>Publish <span dangerouslySetInnerHTML={{ __html: exportThoughtsPhrase }}/>.</span>

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  const setExportContentFromCursor = () => {
    const exported = exportContext(store.getState(), context, selected.type, {
      title: titleChild ? titleChild.value : undefined,
      excludeMeta: !shouldIncludeMetaAttributes
    })
    setExportContent(titleChild ? exported : removeHome(exported).trimStart())
  }

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  const dropDownRef = React.useRef<HTMLDivElement>(null)
  useOnClickOutside(dropDownRef, closeModal)

  // fetch all pending descendants of the cursor once before they are exported
  useEffect(() => {

    if (!isMounted.current) {
      // track isMounted so we can cancel the call to setExportContent after unmount
      isMounted.current = true
      dispatch(pull({ [hashContext(context)]: context }, { maxDepth: Infinity }))
        .then(() => {
          if (isMounted.current) {
            setExportContentFromCursor()
          }
        })
    }
    else {
      setExportContentFromCursor()
    }

    return () => {
      isMounted.current = false
    }
  }, [selected, shouldIncludeMetaAttributes])

  useEffect(() => {

    document.addEventListener('click', onClickOutside)

    const clipboard = new ClipboardJS('.copy-clipboard-btn')

    clipboard.on('success', () => {

      // Note: clipboard leaves unwanted text selection after copy operation. so removing it to prevent issue with gesture handler
      if (document.getSelection()?.toString()) document.getSelection()?.removeAllRanges()

      dispatch([
        modalRemindMeLater({ id: 'help' }),
        alert(`Copied ${exportThoughtsPhrase} to the clipboard`, { alertType: 'clipboard', clearTimeout: 3000 })
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
      document.removeEventListener('click', onClickOutside)
      clipboard.destroy()
    }
  }, [exportThoughtsPhrase])

  const [publishing, setPublishing] = useState(false)
  const [publishedCIDs, setPublishedCIDs] = useState([] as string[])

  /** Updates the isOpen state when clicked outside modal. */
  const onClickOutside = (e: MouseEvent) => {
    if (isOpen && wrapperRef && !wrapperRef.contains(e.target as Node)) {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

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
      }
      catch (e) {
        dispatch(error({ value: e.message }))
        console.error('Download Error', e.message)
      }
    }

    dispatch(modalRemindMeLater({ id: 'export' }))
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
      }
      else {
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

  /** Updates checkbox value when clicked and set the appropriate value in the selected option. */
  const onChangeLosslessCheckbox = () => setShouldIncludeMetaAttributes(!shouldIncludeMetaAttributes)

  /** Created an array of objects so that we can just add object here to get multiple checkbox options created. */
  const advancedSettingsArray: AdvancedSetting[] = [
    {
      id: 'lossless-checkbox',
      onChangeFunc: onChangeLosslessCheckbox,
      defaultChecked: true,
      title: 'Lossless',
      description: 'When checked, include all metaprogramming attributes such as archived thoughts, pins, table view, etc. Check this option for a backup-quality export that can be re-imported with no data loss. Uncheck this option for social sharing or exporting to platforms that do not support em metaprogramming attributes. Which is, uh, all of them.'
    }
  ]

  return (
    <Modal id='export' title='Export' className='popup'>

      {/* Export message */}
      <div className='modal-export-wrapper'>
        <span className='modal-content-to-export'>{exportMessage}</span>
        <span className='modal-drop-down-holder'>
          <ChevronImg dark={dark} onClickHandle={() => setIsOpen(!isOpen)} />
          <div ref={setWrapper}>
            <DropDownMenu
              isOpen={isOpen}
              selected={selected}
              onSelect={(option: ExportOption) => {
                setSelected(option)
                setIsOpen(false)
              }}
              options={exportOptions}
              dark={dark}
              ref={dropDownRef}
            />
          </div>
        </span>
      </div>

      {/* Advanced Settings */}
      <div className='advance-setting-wrapper'>
        <span><a className='advance-setting-link no-select' onClick={onAdvancedClick} style={{ opacity: advancedSettings ? 1 : 0.5 }}>Advanced</a></span>
        <span className='advance-setting-chevron'>
          <ChevronImg
            dark={dark}
            onClickHandle={onAdvancedClick}
            className={advancedSettings ? 'rotate180' : ''}
            additonalStyle={{ opacity: advancedSettings ? 1 : 0.5 }}
          />
        </span>
      </div>

      {advancedSettings &&
        <div className='advance-setting-section'>
          {advancedSettingsArray.map(({ id, onChangeFunc, defaultChecked, title, description }) => {
            return (
              <label className='checkbox-container' key={`${id}-key-${title}`}>
                <div>
                  <p className='advance-setting-label'>{title}</p>
                  <p className='advance-setting-description dim'>{description}</p>
                </div>
                <input type='checkbox' id={id} onChange={onChangeFunc} defaultChecked={defaultChecked} />
                <span className='checkmark'></span>
              </label>
            )
          })}
        </div>
      }

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
        {exportContent !== null
          ? <a data-clipboard-text={exportContent} className='copy-clipboard-btn'>Copy to clipboard</a>
          : <LoadingEllipsis />
        }
      </div>

      {/* Publish */}

      {isDocumentEditable() && <>
        <div className='modal-export-publish'>
          {publishedCIDs.length > 0
            ? <div>
              Published: {publishedCIDs.map(cid =>
                <a key={cid} target='_blank' rel='noopener noreferrer' href={getPublishUrl(cid)} dangerouslySetInnerHTML={{ __html: titleMedium }}/>
              )}
            </div>
            : <div>
              <p>{publishing ? 'Publishing...' : publishMessage}</p>
              <p className='dim'><i>Note: These thoughts are published permanently. <br/>
              This action cannot be undone.</i></p>
            </div>
          }
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

          {(publishing || publishedCIDs.length > 0) && <button
            className='modal-btn-cancel'
            onClick={() => {
              dispatch([
                alert(null),
                modalRemindMeLater({ id: 'help' })
              ])
            }}
            style={{
              fontSize: '14px',
              ...themeColor
            }}
          >
            Close
          </button>}

        </div>
      </>}

    </Modal>
  )
}

export default ModalExport
