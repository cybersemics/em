import classNames from 'classnames'
import moize from 'moize'
import React, { useEffect, useState } from 'react'
import { connect, useDispatch, useSelector } from 'react-redux'
import Autofocus from '../@types/Autofocus'
import Connected from '../@types/Connected'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import setCursor from '../action-creators/setCursor'
import { EM_TOKEN, REGEXP_PUNCTUATIONS, REGEXP_TAGS } from '../constants'
import { isInternalLink } from '../device/router'
import useAutofocus from '../hooks/useAutofocus'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import findDescendant from '../selectors/findDescendant'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import appendToPath from '../util/appendToPath'
import ellipsizeUrl from '../util/ellipsizeUrl'
import equalPath from '../util/equalPath'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isRoot from '../util/isRoot'
import isURL from '../util/isURL'
import isVisibleContext from '../util/isVisibleContext'
import { resolveArray } from '../util/memoizeResolvers'
import parentOf from '../util/parentOf'
import publishMode from '../util/publishMode'
import useMultiline from './Editable/useMultiline'
import HomeLink from './HomeLink'
import StaticSuperscript from './StaticSuperscript'
import UrlIcon from './icons/UrlIcon'

interface ThoughtAnnotationProps {
  autofocus?: Autofocus
  editingValue?: string | null
  env?: string
  focusOffset?: number
  homeContext?: boolean
  invalidState?: boolean
  isEditing?: boolean
  minContexts?: number
  path: Path
  showContextBreadcrumbs?: boolean
  simplePath: SimplePath
  style?: React.CSSProperties
  styleAnnotation?: React.CSSProperties
}

/** Gets the innerHTML of the live thought text. */
const getTextMarkup = (state: State, isEditing: boolean, value: string, id: ThoughtId): string => {
  const labelId = findDescendant(state, id, '=label')
  const labelChildren = labelId ? getAllChildrenAsThoughts(state, labelId) : []
  const { editingValue } = state
  return isEditing
    ? editingValue && value !== editingValue
      ? editingValue
      : value
    : labelChildren.length > 0
    ? labelChildren[0].value
    : ellipsizeUrl(value)
}

/** Adds https to the url if it is missing. Ignores urls at localhost. */
const addMissingProtocol = (url: string) =>
  (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('localhost:') ? 'https://' : '') + url

/** A Url icon that links to the url. */
const UrlIconLink = ({ url }: { url: string }) => {
  const dispatch = useDispatch()
  return (
    <a
      href={addMissingProtocol(url)}
      rel='noopener noreferrer'
      target='_blank'
      className='external-link'
      onClick={e => {
        e.stopPropagation() // prevent Editable onMouseDown
        if (isInternalLink(url)) {
          dispatch((dispatch, getState) => {
            const { path, contextViews } = decodeThoughtsUrl(getState(), {
              exists: true,
              url,
            })
            dispatch(setCursor({ path, replaceContextViews: contextViews }))
          })
          e.preventDefault()
        }
      }}
    >
      <UrlIcon />
    </a>
  )
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtAnnotationProps) => {
  const { cursor, invalidState, editingValue } = state

  const isEditing = equalPath(cursor, props.path)
  const simplePathLive = isEditing
    ? (appendToPath(parentOf(props.simplePath), head(cursor!)) as SimplePath)
    : props.simplePath
  const thought = getThoughtById(state, head(simplePathLive))

  return {
    editingValue: isEditing ? editingValue : null,
    invalidState: isEditing ? invalidState : false,
    isEditing,
    // if a thought has the same value as editValue, re-render its ThoughtAnnotation in order to get the correct number of contexts
    isThoughtValueEditing: editingValue === thought?.value,
  }
}

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
const ThoughtAnnotation = ({
  autofocus,
  path,
  simplePath,
  isEditing,
  minContexts = 2,
  dispatch,
  invalidState,
  editingValue,
  style,
  // only applied to the .subthought container
  styleAnnotation,
}: Connected<ThoughtAnnotationProps>) => {
  const contentRef = React.useRef<HTMLInputElement>(null)
  const value: string | undefined = useSelector((state: State) => {
    const thought = getThoughtById(state, head(path))
    return thought?.value || ''
  })

  const fontSize = useSelector((state: State) => state.fontSize)
  const hideSuperscriptsSetting = useSelector(
    (state: State) => !!findDescendant(state, EM_TOKEN, ['Settings', 'hideSuperscripts']),
  )

  const homeContext = useSelector((state: State) => {
    const pathParent = rootedParentOf(state, path)
    const showContexts = isContextViewActive(state, path)
    return showContexts && isRoot(pathParent)
  })

  const isExpanded = useSelector((state: State) => !!state.expanded[hashPath(simplePath)])
  const url = useSelector((state: State) => {
    const childrenUrls = getAllChildrenAsThoughts(state, head(simplePath)).filter(child => isURL(child.value))
    const urlValue = isURL(value)
      ? value
      : // if the only subthought is a url and the thought is not expanded, link the thought
      !isExpanded && childrenUrls.length === 1 && (!state.cursor || !equalPath(simplePath, parentOf(state.cursor)))
      ? childrenUrls[0].value
      : null
    return urlValue
  })

  // delay calculation of contexts for performance
  // recalculate after the component has mounted
  // filtering on isNotArchive is very slow: O(totalNumberOfContexts * depth)
  const [calculateContexts, setCalculateContexts] = useState(false)

  /**
   * Adding dependency on lexemeIndex as the fetch for thought is async await.
   * ThoughtAnnotation wasn't waiting for all the lexemeIndex to be set before it was rendered.
   * And hence the superscript wasn't rendering properly on load.
   * So now subscribing to get context so that StaticSuperscript is not re-rendered for all lexemeIndex change.
   * It will re-render only when respective Lexeme is changed.
   * Changed as part of fix for issue 1419 (https://github.com/cybersemics/em/issues/1419).
   */

  const numContexts = useSelector(
    moize(
      (state: State) => {
        if (!calculateContexts || hideSuperscriptsSetting) return 0

        // only show real time update if being edited while having meta validation error
        // do not increase numContexts when in an invalid state since the thought has not been updated in state
        const isRealTimeContextUpdate = isEditing && invalidState && editingValue !== null

        const contexts = getContexts(state, isRealTimeContextUpdate ? editingValue! : value)
        return value === ''
          ? 0
          : contexts.filter(id => isVisibleContext(state, id)).length + (isRealTimeContextUpdate ? 1 : 0)
      },
      {
        maxSize: 1000,
        profileName: 'numContexts',
        transformArgs: ([state]) => {
          const isRealTimeContextUpdate = isEditing && invalidState && editingValue !== null
          return [resolveArray(getContexts(state, isRealTimeContextUpdate ? editingValue! : value))]
        },
      },
    ),
  )

  useEffect(() => {
    setCalculateContexts(true)
  }, [])

  const styleAutofocus = useAutofocus(autofocus, styleAnnotation)
  const textMarkup = useSelector((state: State) => getTextMarkup(state, !!isEditing, value, head(simplePath)))
  const showSuperscript =
    !hideSuperscriptsSetting &&
    (REGEXP_PUNCTUATIONS.test(value.replace(REGEXP_TAGS, '')) ? null : minContexts === 0 || numContexts > 1)

  const multiline = useMultiline(contentRef, !!isEditing, value)

  return (
    <div
      className='thought-annotation'
      ref={contentRef}
      style={{
        ...(homeContext ? { height: '1em' } : null),
        // must match marginLeft of StaticThought
        marginLeft: fontSize - 13,
      }}
    >
      {homeContext ? (
        <HomeLink />
      ) : (
        <div
          className={classNames({
            'editable-annotation': true,
            multiline,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}
          style={{
            // add a little padding for highlighting
            padding: '0 3px',
            marginLeft: -3,
            ...styleAnnotation,
            ...styleAutofocus,
          }}
        >
          <span className='editable-annotation-text' style={style} dangerouslySetInnerHTML={{ __html: textMarkup }} />
          {
            // do not render url icon on root thoughts in publish mode
            url && !(publishMode() && simplePath.length === 1) && <UrlIconLink url={url} />
          }
          {
            // with real time context update we increase context length by 1 // with the default minContexts of 2, do not count the whole thought
            showSuperscript ? <StaticSuperscript n={numContexts} style={style} /> : null
          }
        </div>
      )}
    </div>
  )
}

export default connect(mapStateToProps)(ThoughtAnnotation)
