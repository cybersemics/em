import { FontAwesome5 } from '@expo/vector-icons'
import Clipboard from 'expo-clipboard'
import { and } from 'fp-and-or'
import React, { FC, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Share, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { useDispatch, useSelector, useStore } from 'react-redux'
import Context from '../@types/Context'
import ExportOption from '../@types/ExportOption'
import State from '../@types/State'
import Thought from '../@types/Thought'
import ThoughtId from '../@types/ThoughtId'
import ThoughtIndices from '../@types/ThoughtIndices'
import alert from '../action-creators/alert'
import error from '../action-creators/error'
import modalComplete from '../action-creators/modalComplete'
import pull from '../action-creators/pull'
import { AlertType, HOME_PATH } from '../constants'
import contextToThoughtId from '../selectors/contextToThoughtId'
import exportContext from '../selectors/exportContext'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getDescendantThoughtIds from '../selectors/getDescendantThoughtIds'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import themeColors from '../selectors/themeColors'
import exportPhrase from '../util/exportPhrase'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isRoot from '../util/isRoot'
import pathToContext from '../util/pathToContext'
import removeHome from '../util/removeHome'
import { ActionButton } from './ActionButton'
import Modal from './Modal'
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

/******************************************************************************
 * Contexts
 *****************************************************************************/

const PullStatusContext = createContext<boolean>(false)

const DescendantNumberContext = createContext<number | null>(null)

/******************************************************************************
 * Context Providers
 *****************************************************************************/

/**
 * Context to handle pull status and number of descendants.
 */
const PullProvider: FC<{ context: Context }> = ({ children, context }) => {
  const [isPulling, setIsPulling] = useState<boolean>(true)
  // update numDescendants as descendants are pulled
  const [numDescendants, setNumDescendants] = useState<number | null>(null)

  const dispatch = useDispatch()
  const isMounted = useRef(false)

  const store = useStore()

  /** Handle new thoughts pulled. */
  const onThoughts = useCallback((thoughts: ThoughtIndices) => {
    // count the total number of new children pulled
    const numDescendantsNew = Object.values(thoughts.thoughtIndex).reduce((accum, thought) => {
      return accum + Object.keys(thought.childrenMap).length
    }, 0)
    setNumDescendants(numDescendants => (numDescendants ?? 0) + numDescendantsNew)
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
          onLocalThoughts: (thoughts: ThoughtIndices) => onThoughts(thoughts),
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

  const exportThoughtsPhrase = exportPhrase(state, id, numDescendantsFinal ?? numDescendants ?? 0, {
    value: title,
  })

  return <Text>{exportThoughtsPhrase}</Text>
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

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport = () => {
  const store = useStore()
  const dispatch = useDispatch()
  const state = store.getState()
  const cursor = useSelector((state: State) => state.cursor || HOME_PATH)
  const colors = useSelector(themeColors)
  const simplePath = simplifyPath(state, cursor)
  const id = head(simplePath)
  const context = pathToContext(state, simplePath)
  const titleId = findDescendant(state, id, ['=publish', 'Title'])
  const titleChild = getAllChildrenAsThoughts(state, titleId)[0]
  const cursorThought = getThoughtById(state, head(cursor))
  const title = isRoot(cursor) ? 'home' : titleChild ? titleChild.value : cursorThought.value

  const [selected, setSelected] = useState(exportOptions[1])
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)
  const [exportContent, setExportContent] = useState<string | null>(null)
  const [shouldIncludeMetaAttributes, setShouldIncludeMetaAttributes] = useState(true)
  const [shouldIncludeArchived, setShouldIncludeArchived] = useState(true)
  const [numDescendantsInState, setNumDescendantsInState] = useState<number | null>(null)

  const isPulling = usePullStatus()

  const exportWord = 'Share'

  const numDescendants =
    selected?.type === 'text/plain' && exportContent ? exportContent.split('\n').length - 1 : numDescendantsInState!
  const exportThoughtsPhrase = exportPhrase(state, id, numDescendants, {
    value: title,
  })

  /** Sets the exported context from the cursor using the selected type and making the appropriate substitutions. */
  const setExportContentFromCursor = () => {
    const exported = exportContext(store.getState(), context, selected?.type, {
      title: titleChild ? titleChild.value : undefined,
      excludeMeta: !shouldIncludeMetaAttributes,
      excludeArchived: !shouldIncludeArchived,
    })

    setExportContent(titleChild ? exported : removeHome(exported).trimStart())
  }

  // Sets export content when pull is complete by useDescendants
  useEffect(() => {
    setExportContentFromCursor()
  }, [isPulling])

  useEffect(() => {
    if (!shouldIncludeMetaAttributes) setShouldIncludeArchived(false)

    // when exporting HTML, we have to do a full traversal since the numDescendants heuristic of counting the number of lines in the exported content does not work
    if (selected?.type === 'text/html') {
      setNumDescendantsInState(
        getDescendantThoughtIds(state, id, {
          filterFunction: and(
            shouldIncludeMetaAttributes || ((child: Thought) => !isAttribute(child.value)),
            shouldIncludeArchived || ((child: Thought) => child.value !== '=archive'),
          ),
        }).length,
      )
    }

    // TODO: check if is pulling
    setExportContentFromCursor()
  }, [selected, shouldIncludeMetaAttributes, shouldIncludeArchived])

  const [publishing, setPublishing] = useState(false)
  const [publishedCIDs, setPublishedCIDs] = useState([] as string[])

  /** Shares or downloads when the export button is clicked. */
  const onExportClick = async () => {
    try {
      await Share.share({
        message: exportContent!,
      })
    } catch (e) {
      dispatch(error({ value: e.message }))

      console.error('Download Error', e.message)
    }
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
      modalComplete('export'),
      alert(`Copied ${exportThoughtsPhrase} to the clipboard`, {
        alertType: AlertType.Clipboard,
        clearDelay: 3000,
      }),
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
          {exportWord} <ExportThoughtsPhrase id={id} numDescendantsFinal={numDescendants} title={title} />
          <RNPickerSelect
            onValueChange={(value: number) => {
              setSelectedOptionIndex(value)
              setSelected(exportOptions[value])
            }}
            value={selectedOptionIndex}
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
                <View style={styles.checkContainer}>{checked && <FontAwesome5 name='check' color={colors.fg} />}</View>
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
      <ModalExport />
    </PullProvider>
  )
}

export default ModalExportWrapper
