import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'
import ClipboardJS from 'clipboard'
import globals from '../globals'
import IpfsHttpClient from 'ipfs-http-client'
import { RANKED_ROOT, RENDER_DELAY } from '../constants'
import { download, ellipsize, getPublishUrl, headValue, isDocumentEditable, isRoot, pathToContext, timestamp, unroot } from '../util'
import { alert } from '../action-creators'
import { exportContext, getDescendants, getAllChildren, simplifyPath, theme } from '../selectors'
import Modal from './Modal'
import DropDownMenu from './DropDownMenu'
import { State } from '../util/initialState'
import { ExportOption } from '../types'

const ipfs = IpfsHttpClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

const clipboard = new ClipboardJS('.copy-clipboard-btn')

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport = () => {

  const store = useStore()
  const dispatch = useDispatch()
  const state = store.getState()
  const cursor = useSelector((state: State) => state.cursor || RANKED_ROOT)
  const context = pathToContext(cursor)
  const contextTitle = unroot(context.concat(['=publish', 'Title']))
  const titleChild = getAllChildren(state, contextTitle)[0]
  const title = isRoot(cursor) ? 'home'
    : titleChild ? titleChild.value
    : headValue(cursor)
  const titleShort = ellipsize(title)
  const titleMedium = ellipsize(title, 25)

  const [selected, setSelected] = useState(exportOptions[0])
  const [isOpen, setIsOpen] = useState(false)
  const [wrapperRef, setWrapper] = useState()
  const [exportContent, setExportContent] = useState('')

  const dark = theme(state) !== 'Light'
  const themeColor = {
    color: dark ? 'white' : 'black'
  }
  const themeColorWithBackground = dark ? {
    color: 'black',
    backgroundColor: 'white',
  } : {
    color: 'white',
    backgroundColor: 'black',
  }

  const numDescendants = getDescendants(state, simplifyPath(state, cursor)).length

  // @ts-ignore
  const exportWord = navigator.share ? 'Share' : 'Download'

  const exportThoughtsPhrase = isRoot(cursor)
    ? ` all ${numDescendants} thoughts`
    : <span>"{titleShort}"{numDescendants > 0 ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}</span>
  const exportMessage = <span>
    {exportWord} {exportThoughtsPhrase}
    <span> as <a style={themeColor} onClick={() => setIsOpen(!isOpen)}>{selected.label}</a></span>
    .
  </span>
  const publishMessage = <span>Publish {exportThoughtsPhrase}.</span>

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  const setExportContentFromCursor = () => {
    const exported = exportContext(state, pathToContext(cursor), selected.type, {
      title: titleChild ? titleChild.value : undefined
    })
    setExportContent(exported)
  }

  useEffect(() => {
    // export context
    // delay to avoid freezing before page is rendered
    const exportContentTimer = setTimeout(() => {
      setExportContentFromCursor()
    }, RENDER_DELAY)

    document.addEventListener('click', onClickOutside)
    return () => {
      document.removeEventListener('click', onClickOutside)
      clearTimeout(exportContentTimer)
    }
  })

  const [publishing, setPublishing] = useState(false)
  const [publishedCIDs, setPublishedCIDs] = useState([] as string[])

  clipboard.on('success', () => {
    dispatch(alert('Thoughts copied to clipboard'))
    clearTimeout(globals.errorTimer)
    // @ts-ignore
    globals.errorTimer = window.setTimeout(() => dispatch(alert(null)), 10000)
  })

  clipboard.on('error', () => {
    dispatch({ type: 'error', value: 'Error copying thoughts' })
    clearTimeout(globals.errorTimer)
    // @ts-ignore
    globals.errorTimer = window.setTimeout(() => dispatch(alert(null)), 10000)
  })

  /** Updates the isOpen state when clicked outside modal. */
  const onClickOutside = (e: MouseEvent) => {
    // @ts-ignore
    if (isOpen && wrapperRef && !wrapperRef.contains(e.target)) {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

  /** Shares or downloads when the export button is clicked. */
  const onExportClick = () => {

    // use mobile share if it is available
    if (navigator.share) {
      navigator.share({
        text: exportContent,
        title: titleShort,
      })
    }
    // otherwise download the data with createObjectURL
    else {
      try {
        download(exportContent, `em-${title}-${timestamp()}.${selected.extension}`, selected.type)
      }
      catch (e) {
        dispatch({ type: 'error', value: e.message })
        console.error('Download Error', e.message)
      }
    }

    dispatch({ type: 'modalRemindMeLater', id: 'export' })
  }

  /** Publishes the thoughts to IPFS. */
  const onPublishClick = async () => {

    setPublishing(true)
    setPublishedCIDs([])

    const cids = []

    // export without =src content
    const exported = exportContext(state, pathToContext(cursor), selected.type, {
      excludeSrc: true,
      title: titleChild ? titleChild.value : undefined,
    })

    // eslint-disable-next-line fp/no-loops
    for await (const result of ipfs.add(exported)) {
      if (result && result.path) {
        const cid = result.path
        dispatch({ type: 'prependRevision', path: cursor, cid })
        cids.push(cid) // eslint-disable-line fp/no-mutating-methods
        setPublishedCIDs(cids)
      }
      else {
        setPublishing(false)
        setPublishedCIDs([])
        dispatch({ type: 'error', value: 'Publish Error' })
        console.error('Publish Error', result)
      }
    }

    setPublishing(false)
  }

  /** Closes the modal. */
  const closeModal = () => {
    dispatch(alert(null))
    dispatch({ type: 'modalRemindMeLater', id: 'help' })
  }

  return (
    // @ts-ignore
    <Modal id='export' title='Export' className='popup'>

      <div className='modal-export-wrapper'>
        <span className='modal-content-to-export'>{exportMessage}</span>
        <span className='modal-drop-down-holder'>
          <img
            src={dark ? ArrowDownWhite : ArrowDownBlack}
            alt='Arrow'
            height='22px'
            width='22px'
            style={{ cursor: 'pointer' }}
            onClick={() => setIsOpen(!isOpen)}
          />
          <div ref={setWrapper as any}>
            <DropDownMenu
              isOpen={isOpen}
              selected={selected}
              onSelect={(option: ExportOption) => {
                setExportContentFromCursor()
                setSelected(option)
                setIsOpen(false)
              }}
              options={exportOptions}
              dark={dark}
            />
          </div>
        </span>
      </div>

      <div className='cp-clipboard-wrapper'>
        <a data-clipboard-text={exportContent} className='copy-clipboard-btn'>Copy to clipboard</a>
      </div>

      <div className='modal-export-btns-wrapper'>

        <button
          className='modal-btn-export'
          disabled={!exportContent}
          onClick={onExportClick}
          style={themeColorWithBackground}
        >
          {exportWord}
        </button>

      </div>

      {isDocumentEditable() && <React.Fragment>
        <div className='modal-export-publish'>
          {publishedCIDs.length > 0
            ? <div>
              Published: {publishedCIDs.map(cid =>
                <a key={cid} target='_blank' rel='noopener noreferrer' href={getPublishUrl(cid)}>{titleMedium}</a>
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
            onClick={onPublishClick}
            style={themeColorWithBackground}
          >
            Publish
          </button>

          {(publishing || publishedCIDs.length > 0) && <button
            className='modal-btn-cancel'
            onClick={closeModal}
            style={{
              fontSize: '14px',
              ...themeColor
            }}
          >
            Close
          </button>}

        </div>
      </React.Fragment>}

    </Modal>
  )
}

export default ModalExport
