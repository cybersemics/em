import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import ArrowDownWhite from '../images/keyboard_arrow_down_352466.svg'
import ArrowDownBlack from '../images/iconfinder_ic_keyboard_arrow_down_black_352466.svg'
import ClipboardJS from 'clipboard'
import globals from '../globals'
import IpfsHttpClient from 'ipfs-http-client'

// constants
import {
  RANKED_ROOT,
  RENDER_DELAY,
} from '../constants'

//  util
import {
  download,
  ellipsize,
  getPublishUrl,
  headValue,
  isDocumentEditable,
  isRoot,
  pathToContext,
  timestamp,
  unroot,
} from '../util'

// action-creators
import alert from '../action-creators/alert'
import { error } from '../action-creators/error'
import prependRevision from '../action-creators/prependRevision'

// components
import Modal from './Modal'
import DropDownMenu from './DropDownMenu'

// selectors
import theme from '../selectors/theme'
import getThoughts from '../selectors/getThoughts'
import { exportContext, getDescendants } from '../selectors'

const ipfs = IpfsHttpClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })

const exportOptions = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

const clipboard = new ClipboardJS('.copy-clipboard-btn')

const ModalExport = () => {

  const store = useStore()
  const dispatch = useDispatch()
  const state = store.getState()
  const cursor = useSelector(state => state.cursor || RANKED_ROOT)
  const cursorLabel = isRoot(cursor) ? 'home' : ellipsize(headValue(cursor))
  const cursorTitle = isRoot(cursor) ? 'Home' : ellipsize(headValue(cursor), 25)
  const context = pathToContext(cursor)
  const contextTitle = unroot(context.concat(['=publish', 'Title']))
  const titleChild = getThoughts(state, contextTitle)[0]

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

  const numDescendants = getDescendants(store.getState(), cursor).length
  const exportWord = navigator.share ? 'Share' : 'Download'

  const exportThoughtsPhrase = isRoot(cursor)
    ? ` all ${numDescendants} thoughts`
    : <span>"{cursorLabel}"{numDescendants > 0 ? ` and ${numDescendants} subthought${numDescendants === 1 ? '' : 's'}` : ''}</span>
  const exportMessage = <span>
    {exportWord} {exportThoughtsPhrase}
    <span> as <a style={themeColor} onClick={() => setIsOpen(!isOpen)}>{selected.label}</a></span>
    .
  </span>
  const publishMessage = <span>Publish {exportThoughtsPhrase}.</span>

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions */
  const setExportContentFromCursor = () => {
    const exported = exportContext(state, pathToContext(cursor), selected.type, {
      title: titleChild ? titleChild.value : null
    })
    setExportContent(exported)
  }

  // export context
  // delay to avoid freezing before page is rendered
  setTimeout(() => {
    setExportContentFromCursor()
  }, RENDER_DELAY)

  useEffect(() => {
    document.addEventListener('click', onClickOutside)
    return () => {
      document.removeEventListener('click', onClickOutside)
    }
  })

  const [publishing, setPublishing] = useState(false)
  const [publishedCIDs, setPublishedCIDs] = useState([])

  clipboard.on('success', function (e) {
    alert('Thoughts copied to clipboard')
    clearTimeout(globals.errorTimer)
    globals.errorTimer = window.setTimeout(() => alert(null), 10000)
  })

  clipboard.on('error', function (e) {
    error('Error copying thoughts')
    clearTimeout(globals.errorTimer)
    globals.errorTimer = window.setTimeout(() => alert(null), 10000)
  })

  const onClickOutside = e => {
    if (isOpen && wrapperRef && !wrapperRef.contains(e.target)) {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

  const onExportClick = () => {

    const title = cursorLabel

    // use mobile share if it is available
    if (navigator.share) {
      navigator.share({
        text: exportContent,
        title,
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

  const onPublishClick = async () => {

    setPublishing(true)
    setPublishedCIDs([])

    const cids = []

    // eslint-disable-next-line fp/no-loops
    for await (const result of ipfs.add(exportContent)) {
      if (result && result.path) {
        const cid = result.path
        dispatch(prependRevision(cursor, cid))
        cids.push(cid) // eslint-disable-line fp/no-mutating-methods
        setPublishedCIDs(cids)
      }
      else {
        setPublishing(false)
        setPublishedCIDs([])
        error('Publish Error')
        console.error('Publish Error', result)
      }
    }

    setPublishing(false)
  }

  const closeModal = () => {
    alert(null)
    dispatch({ type: 'modalRemindMeLater', id: 'help' })
  }

  return (
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
          <div ref={setWrapper}>
            <DropDownMenu
              isOpen={isOpen}
              selected={selected}
              onSelect={option => {
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

      <div className="cp-clipboard-wrapper">
        <a data-clipboard-text={exportContent} className="copy-clipboard-btn">Copy to clipboard</a>
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

        <button
          className='modal-btn-cancel'
          style={{
            fontSize: '14px',
            ...themeColor
          }}
          onClick={closeModal}>
          Cancel
        </button>

      </div>

      {isDocumentEditable() && <React.Fragment>
        <div className='modal-export-publish'>
          {publishedCIDs.length > 0
            ? <div>
              Published: {publishedCIDs.map(cid =>
                <a key={cid} target='_blank' rel='noopener noreferrer' href={getPublishUrl(cid)}>{cursorTitle}</a>
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

          <button
            className='modal-btn-cancel'
            onClick={closeModal}
            style={{
              fontSize: '14px',
              ...themeColor
            }}
          >
            {publishing || publishedCIDs.length > 0 ? 'Close' : 'Cancel'}
          </button>

        </div>
      </React.Fragment>}

    </Modal>
  )
}

export default ModalExport
