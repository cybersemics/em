import React, { useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'

import { HOME_PATH } from '../constants'
import {
  download,
  ellipsize,
  exportPhrase,
  // hashContext,
  headValue,
  isRoot,
  pathToContext,
  timestamp,
  unroot,
} from '../util'
import { alert, error, closeModal } from '../action-creators'
import { exportContext, getAllChildren, simplifyPath } from '../selectors'
import Modal from './Modal'

import { ExportOption, State } from '../@types'
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { FontAwesome5 } from '@expo/vector-icons'
import { ActionButton } from './ActionButton'
import Clipboard from 'expo-clipboard'
import { Text } from './Text.native'

interface AdvancedSetting {
  id: string
  onChangeFunc: () => void
  defaultChecked: boolean
  checked: boolean
  title: string
  description: string
}

const exportSelectOptions = [
  { label: 'Plain Text', value: 0 },
  { label: 'HTML', value: 1 },
]

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
]

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport = () => {
  const store = useStore()
  const dispatch = useDispatch()
  // const isMounted = useRef(false)
  const state = store.getState()
  const cursor = useSelector((state: State) => state.cursor || HOME_PATH)
  const simplePath = simplifyPath(state, cursor)
  const context = pathToContext(simplePath)
  const contextTitle = unroot(context.concat(['=publish', 'Title']))
  const titleChild = getAllChildren(state, contextTitle)[0]
  const title = isRoot(cursor) ? 'home' : titleChild ? titleChild.value : headValue(cursor)
  const titleShort = ellipsize(title)
  // const titleMedium = ellipsize(title, 25)

  const [selected, setSelected] = useState(exportOptions[0])
  // const [isOpen, setIsOpen] = useState(false)
  // const [wrapperRef, setWrapper] = useState<HTMLElement | null>(null)
  const [exportContent] = useState<string | null>(null)
  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(true)
  const [shouldIncludeArchived, setShouldIncludeArchived] = useState(true)
  // const [numDescendantsInState, setNumDescendantsInState] = useState<number | null>(null)
  const numDescendantsInState = 0

  // const dark = theme(state) !== 'Light'
  // const themeColor = { color: dark ? 'white' : 'black' }
  // const themeColorWithBackground = dark
  //   ? { color: 'black', backgroundColor: 'white' }
  //   : { color: 'white', backgroundColor: 'black' }

  const exportWord = 'Share'

  const numDescendants =
    selected.type === 'text/plain' && exportContent ? exportContent.split('\n').length - 1 : numDescendantsInState!
  const exportThoughtsPhrase = exportPhrase(state, context, numDescendants, {
    value: title,
  })

  // /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  // const setExportContentFromCursor = () => {
  //   const exported = exportContext(store.getState(), context, selected.type, {
  //     title: titleChild ? titleChild.value : undefined,
  //     excludeMeta: !shouldIncludeMetaAttributes,
  //     excludeArchived: !shouldIncludeArchived,
  //   })

  //   setExportContent(titleChild ? exported : removeHome(exported).trimStart())
  // }

  // const closeDropdown = useCallback(() => {
  //   setIsOpen(false)
  // }, [])

  // fetch all pending descendants of the cursor once before they are exported
  // useEffect(() => {
  //   if (!isMounted.current) {
  //     // track isMounted so we can cancel the call to setExportContent after unmount
  //     isMounted.current = true
  //     dispatch(pull({ [hashContext(context)]: context }, { maxDepth: Infinity })).then(() => {
  //       if (isMounted.current) {
  //         setExportContentFromCursor()
  //       }
  //     })
  //   } else {
  //     setExportContentFromCursor()
  //   }

  //   if (!shouldIncludeMetaAttributes) setShouldIncludeArchived(false)

  //   return () => {
  //     isMounted.current = false
  //   }
  // }, [selected, shouldIncludeMetaAttributes, shouldIncludeArchived])

  const [publishing, setPublishing] = useState(false)
  const [publishedCIDs, setPublishedCIDs] = useState([] as string[])

  /** Updates the isOpen state when clicked outside modal. */
  // const onClickOutside = (e: MouseEvent) => {
  //   if (isOpen && wrapperRef && !wrapperRef.contains(e.target as Node)) {
  //     setIsOpen(false)
  //     e.stopPropagation()
  //   }
  // }

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

  /** Copy to clipboard. */
  const copyToClipboard = () => {
    Clipboard.setString(exportContent || '')
    dispatch([
      // TODO: Fix close modal.
      closeModal(),
      alert(`Copied ${exportThoughtsPhrase} to the clipboard`, { alertType: 'clipboard', clearTimeout: 3000 }),
    ])
  }

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
      <View style={styles.exportContentContainer}>
        <Text style={styles.white}>
          {`${exportWord} ${exportThoughtsPhrase} as`}

          <RNPickerSelect
            onValueChange={(value: number) => setSelected(exportOptions[value])}
            style={{
              placeholder: styles.placeholder,
              inputIOS: styles.pickerInputStyle,
              inputAndroid: styles.pickerInputStyle,
              iconContainer: styles.iconContainer,
            }}
            items={exportSelectOptions}
            Icon={() => (
              <View>
                <FontAwesome5 name='chevron-down' color='white' size={12} />
              </View>
            )}
          />
        </Text>
      </View>

      <TextInput multiline editable={false} value={exportContent || ''} style={styles.textArea} />

      <View style={styles.alignItemsCentre}>
        <ActionButton title={exportWord} onClick={onExportClick} />

        <TouchableOpacity
          disabled={!exportContent || publishing || publishedCIDs.length > 0}
          onPress={copyToClipboard}
          style={styles.marginVertical}
        >
          <Text style={styles.clipboard}>Copy to clipboard</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onAdvancedClick} style={styles.marginVertical}>
          <Text style={styles.advanced}>Advanced</Text>
        </TouchableOpacity>
      </View>

      {advancedSettings && (
        <View>
          {advancedSettingsArray.map(({ id, onChangeFunc, defaultChecked, checked, title, description }) => {
            return (
              <TouchableOpacity
                onPress={onChangeFunc}
                key={`${id}-key-${title}`}
                style={[styles.marginVertical, styles.row]}
              >
                <View style={styles.checkContainer}>{checked && <FontAwesome5 name='check' color='#fff' />}</View>
                <View>
                  <Text style={styles.white}>{title}</Text>
                  <Text style={[styles.white, styles.opacity]}>{description}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      <View style={styles.publishContainer}>
        <Text style={styles.white}>{`${publishing ? 'Publishing...' : `Publish ${exportThoughtsPhrase}.`}`}</Text>
        <Text style={styles.noteText}>
          {'Note: These thoughts are published permanently.\nThis action cannot be undone.'}
        </Text>
        <ActionButton title='Publish' onClick={publish} />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  exportContentContainer: { alignItems: 'center', marginTop: 40 },
  noteText: { marginVertical: 15, fontSize: 2, color: 'white', opacity: 0.5, fontStyle: 'italic', textAlign: 'center' },
  white: { color: 'white', fontSize: 2 },
  opacity: { opacity: 0.5 },
  marginVertical: { marginVertical: 10 },
  alignItemsCentre: { alignItems: 'center' },
  row: { flexDirection: 'row' },
  clipboard: { color: 'lightblue', textDecorationLine: 'underline', fontSize: 4 },
  advanced: { color: 'white', textDecorationLine: 'underline', fontSize: 4 },
  pickerInputStyle: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    textAlign: 'center',
    color: 'white',
    marginLeft: 5,
    borderBottomWidth: 1,
    borderColor: 'white',
  },
  placeholder: {
    color: 'white',
    textAlign: 'center',
  },
  iconContainer: {
    bottom: 5,
    right: -10,
  },
  chevronDown: { position: 'absolute', right: 20 },
  textArea: {
    marginVertical: 20,
    alignSelf: 'center',
    backgroundColor: '#111',
    borderRadius: 10,
    color: '#aaa',
    fontSize: 16,
    height: 200,
    marginBottom: 20,
    width: 300,
  },
  publishContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    borderColor: 'white',
    alignItems: 'center',
    paddingTop: 30,
    marginTop: 30,
  },
  checkContainer: {
    width: 20,
    height: 20,
    borderColor: 'white',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
})

export default ModalExport
