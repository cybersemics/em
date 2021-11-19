import React, { FC, useCallback, useEffect, useRef, useState, createContext, useContext } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { and } from 'fp-and-or'
import ClipboardJS from 'clipboard'
import globals from '../globals'
import { HOME_PATH } from '../constants'
import {
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
import { exportContext, getAllChildren, getDescendantPaths, simplifyPath, theme } from '../selectors'
import Modal from './Modal'
import DropDownMenu from './DropDownMenu'
import LoadingEllipsis from './LoadingEllipsis'
import Chevron from './Chevron'
import { isTouch } from '../browser'
import useOnClickOutside from 'use-onclickoutside'
import download from '../device/download'
import * as selection from '../device/selection'
import { Child, Context, ExportOption, Path, SimplePath, State, ThoughtsInterface } from '../@types'
import tw from 'twin.macro'
import { ActionButton } from './ActionButton'
import TextLink from './TextLink'
import styled from 'styled-components'
import TextArea from './TextArea'

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

  /** Handle new thoughts pulled. */
  const onThoughts = useCallback((thoughts: ThoughtsInterface) => {
    // count the total number of new children pulled
    const numDescendantsNew = Object.values(thoughts.contextIndex).reduce((accum, parent) => {
      return accum + parent.children.length
    }, 0)
    setNumDescendants(numDescendants => (numDescendants ?? 0) + numDescendantsNew)
  }, [])

  // fetch all pending descendants of the cursor once for all components
  // track isMounted so we can cancel the end trigger after unmount
  useEffect(() => {
    if (isMounted.current) return

    isMounted.current = true
    dispatch(
      pull(
        { [hashContext(context)]: context },
        {
          onLocalThoughts: (thoughts: ThoughtsInterface) => onThoughts(thoughts),
          // TODO: onRemoteThoughts ??
          maxDepth: Infinity,
        },
      ),
    ).then(() => {
      // isMounted will be set back to false on unmount, preventing exportContext from unnecessarily being called after the component has unmounted
      if (isMounted.current) {
        setIsPulling(false)
      }
    })

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
  defaultChecked: boolean
  checked: boolean
  title: string
  description: string
}

const exportOptions: ExportOption[] = [
  { type: 'text/plain', label: 'Plain Text', extension: 'txt' },
  { type: 'text/html', label: 'HTML', extension: 'html' },
  { type: 'text/markdown', label: 'Markdown', extension: 'md' },
]

/******************************************************************************
 * ExportThoughtsPhrase component
 *****************************************************************************/

interface ExportThoughtsPhraseOptions {
  context: Context
  // the final number of descendants
  numDescendantsFinal: number | null
  title: string
}

/** A user-friendly phrase describing how many thoughts will be exported. Updated with an estimate as thoughts are pulled. */
const ExportThoughtsPhrase = ({ context, numDescendantsFinal, title }: ExportThoughtsPhraseOptions) => {
  const store = useStore()
  const state = store.getState()

  // updates with latest number of descendants
  const numDescendants = useDescendantsNumber()

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
        <Chevron orientation={isOpen ? 'up' : 'down'} onClickHandle={() => setIsOpen(!isOpen)} />
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

const ModalExportContainer = tw.section`
 flex justify-center
 mb-4
`

const ActionWrapper = tw.div`
  flex justify-center
  mt-14 mb-5
`

const ClipboardWrapper = tw.div`
  text-center
`

const AdvancedSettingContainer = tw.div`
  flex justify-center
  mt-14
`

const AdvancedSettingLink = styled(TextLink)<{ active?: boolean }>`
  ${tw`
    relative
    transition-opacity
    text-gray-700
    dark:text-gray-400
    `}
  ${props => (props.active ? tw`text-opacity-100` : tw`text-opacity-60`)};
`
const ChevronContainer = tw.span`
  relative
  flex flex-col items-center
`

const AdvancedSettingSection = tw.section`
  mx-auto
  flex flex-col justify-center
  max-width[35rem]
`

const CheckMark = styled.span`
  ${tw`
    absolute top-0 left-0
    height[15px] width[15px]
    bg-black
    border border-solid border-white
  `}

  &::after {
    content: '';
    position: absolute;
    left: 5px;
    top: 1px;
    width: 4px;
    height: 9px;
    border: solid white;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    display: none;
  }
`

const CheckboxInput = styled.input`
  ${tw`
    absolute
    opacity-0
    cursor-pointer
    height[0] width[0]
  `}

  &:checked ~ ${CheckMark}:after {
    display: block;
  }
`

const CheckboxContainer = tw.label`
  block 
  relative
  mb-3 pl-9
  cursor-pointer
  select-none
`

const SettingLabel = tw.p`
  mb-1.5
  text-base
`

const SettingDescription = tw.p`
  text-sm
  opacity-70
`

const ModalExportPublish = tw.div`
  border-t-2 border-top-style[solid] border-gray-300 dark:border-gray-700
  mt-8 mb-5 pt-10
  text-center
`

const ButtonWrapper = tw.div`
  flex justify-center
`
/******************************************************************************
 * ModalExport component
 *****************************************************************************/

/** A modal that allows the user to export, download, share, or publish their thoughts. */
const ModalExport: FC<{ context: Context; simplePath: SimplePath; cursor: Path }> = ({
  context,
  simplePath,
  cursor,
}) => {
  const store = useStore()
  const dispatch = useDispatch()
  const state = store.getState()
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

  // Sets export content when pull is complete by useDescendants
  useEffect(() => {
    if (!isPulling) setExportContentFromCursor()
  }, [isPulling])

  useEffect(() => {
    if (!shouldIncludeMetaAttributes) setShouldIncludeArchived(false)

    // when exporting HTML, we have to do a full traversal since the numDescendants heuristic of counting the number of lines in the exported content does not work
    if (selected.type === 'text/html' || selected.type === 'text/markdown') {
      setNumDescendantsInState(
        getDescendantPaths(state, simplePath, {
          filterFunction: and(
            shouldIncludeMetaAttributes || ((child: Child) => !isFunction(child.value)),
            shouldIncludeArchived || ((child: Child) => child.value !== '=archive'),
          ),
        }).length,
      )
    }

    if (!isPulling) {
      setExportContentFromCursor()
    }
  }, [selected, shouldIncludeMetaAttributes, shouldIncludeArchived])

  useEffect(() => {
    const clipboard = new ClipboardJS('.copy-clipboard-btn')

    clipboard.on('success', () => {
      // Note: clipboard leaves unwanted text selection after copy operation. so removing it to prevent issue with gesture handler
      selection.clear()

      dispatch([
        closeModal(),
        alert(`Copied ${exportThoughtsPhrase} to the clipboard`, { alertType: 'clipboard', clearDelay: 3000 }),
      ])

      clearTimeout(globals.errorTimer)
    })

    clipboard.on('error', e => {
      console.error(e)
      dispatch(error({ value: 'Error copying thoughts' }))

      clearTimeout(globals.errorTimer)
      globals.errorTimer = setTimeout(() => dispatch(alert(null, { alertType: 'clipboard' })), 10000)
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
    <Modal id='export' title='Export'>
      {/* Export message */}
      <ModalExportContainer>
        <span>
          <span>
            {exportWord} <ExportThoughtsPhrase context={context} numDescendantsFinal={numDescendants} title={title} />
            <span>
              {' '}
              as <ExportDropdown selected={selected} onSelect={setSelected} />
            </span>
          </span>
        </span>
      </ModalExportContainer>

      {/* Preview */}
      <TextArea readOnly value={exportContent || ''}></TextArea>
      {/* Download button */}
      <ActionWrapper>
        <ActionButton title={exportWord} disabled={exportContent === null} onClick={onExportClick}></ActionButton>
      </ActionWrapper>

      {/* Copy to clipboard */}
      <ClipboardWrapper>
        {exportContent !== null ? (
          <TextLink underline={true} data-clipboard-text={exportContent}>
            Copy to clipboard
          </TextLink>
        ) : (
          <LoadingEllipsis />
        )}
      </ClipboardWrapper>
      {/* Advanced Settings */}
      <AdvancedSettingContainer>
        <span>
          <AdvancedSettingLink active={advancedSettings} onClick={onAdvancedClick}>
            Advanced
          </AdvancedSettingLink>
        </span>
        <ChevronContainer>
          <Chevron orientation={!advancedSettings ? 'down' : 'up'} onClickHandle={onAdvancedClick} />
        </ChevronContainer>
      </AdvancedSettingContainer>

      {advancedSettings && (
        <AdvancedSettingSection>
          {advancedSettingsArray.map(({ id, onChangeFunc, defaultChecked, checked, title, description }) => {
            return (
              <CheckboxContainer className='chckbox-container' key={`${id}-key-${title}`}>
                <div>
                  <SettingLabel>{title}</SettingLabel>
                  <SettingDescription>{description}</SettingDescription>
                </div>
                <CheckboxInput
                  type='checkbox'
                  id={id}
                  checked={!!checked}
                  onChange={onChangeFunc}
                  defaultChecked={!!defaultChecked}
                />
                <CheckMark></CheckMark>
              </CheckboxContainer>
            )
          })}
        </AdvancedSettingSection>
      )}

      {/* Publish */}

      {isDocumentEditable() && (
        <>
          <ModalExportPublish>
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
                <p tw='mb-4'>
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
          </ModalExportPublish>

          <ButtonWrapper>
            <ActionButton
              title='Publish'
              disabled={!exportContent || publishing || publishedCIDs.length > 0}
              onClick={publish}
            ></ActionButton>
            {(publishing || publishedCIDs.length > 0) && (
              <ActionButton
                title='Close'
                onClick={() => {
                  dispatch([alert(null), closeModal()])
                }}
              ></ActionButton>
            )}
          </ButtonWrapper>
        </>
      )}
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
  const context = pathToContext(simplePath)

  return (
    <PullProvider context={context}>
      <ModalExport simplePath={simplePath} cursor={cursor} context={context} />
    </PullProvider>
  )
}

export default ModalExportWrapper
