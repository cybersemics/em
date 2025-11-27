import moize from 'moize'
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isSafari, isTouch } from '../browser'
import { REGEX_PUNCTUATIONS, REGEX_TAGS, Settings } from '../constants'
import attributeEquals from '../selectors/attributeEquals'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import findDescendant from '../selectors/findDescendant'
import { anyChild, filterAllChildren } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import containsURL from '../util/containsURL'
import equalPath from '../util/equalPath'
import fastClick from '../util/fastClick'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isEmail from '../util/isEmail'
import isVisibleContext from '../util/isVisibleContext'
import parentOf from '../util/parentOf'
import publishMode from '../util/publishMode'
import resolveArray from '../util/resolveArray'
import stripTags from '../util/stripTags'
import FauxCaret from './FauxCaret'
import StaticSuperscript from './StaticSuperscript'
import ThoughtAnnotationWrapper from './ThoughtAnnotationWrapper'
import EmailIcon from './icons/EmailIcon'
import UrlIcon from './icons/UrlIcon'

const urlLinkStyle = css({
  /* set height of this a tag to 1em to make sure the a tag doesn't affect .thought annotation's line height */
  height: '1em',
  display: 'inline-block',
  overflow: 'hidden',
  position: 'relative',
  zIndex: 'thoughtAnnotationLink',
  marginLeft: 3,
  textDecoration: 'none',
  verticalAlign: 'text-top',
})

/** Returns true if a link is to a thought within the user's thoughtspace. */
const isInternalLink = (url: string) => typeof window === 'undefined' || url.startsWith(window.location.origin)

/** Adds https to the url if it is missing. Ignores urls at localhost. */
const addMissingProtocol = (url: string) =>
  (!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('localhost:') ? 'https://' : '') + url

/** A Url icon that links to the url. */
const UrlIconLink = React.memo(({ isVisible, url }: { isVisible?: boolean; url: string }) => {
  const dispatch = useDispatch()
  return (
    <a
      href={addMissingProtocol(url)}
      rel='noopener noreferrer'
      target='_blank'
      className={cx(urlLinkStyle, css({ pointerEvents: !isVisible ? 'none' : 'all' }))}
      {...fastClick(e => {
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
      })}
    >
      <UrlIcon />
    </a>
  )
})
UrlIconLink.displayName = 'UrlIconLink'

/** Renders an email icon and adds mailto: to email addresses. */
const EmailIconLink = React.memo(({ email }: { email: string }) => (
  <a href={`mailto:${email}`} target='_blank' rel='noopener noreferrer' className={urlLinkStyle}>
    {' '}
    <EmailIcon />
  </a>
))
EmailIconLink.displayName = 'EmailIconLink'
/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
const ThoughtAnnotation = React.memo(
  ({
    email,
    isEditing,
    isVisible,
    multiline,
    ellipsizedUrl,
    numContexts,
    showSuperscript,
    simplePath,
    cssRaw,
    style,
    // only applied to the .subthought container
    styleAnnotation,
    url,
    placeholder,
    value,
  }: {
    email?: string
    isEditing: boolean
    isVisible?: boolean
    multiline?: boolean
    ellipsizedUrl?: boolean
    numContexts: number
    showSuperscript?: boolean
    simplePath: SimplePath
    cssRaw?: SystemStyleObject
    style?: React.CSSProperties
    styleAnnotation?: React.CSSProperties
    url?: string | null
    placeholder?: string
    value: string
  }) => {
    const liveValueIfEditing = editingValueStore.useSelector((editingValue: string | null) =>
      isEditing ? (editingValue ?? value) : null,
    )

    const isTableCol1 = useSelector((state: State) =>
      attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
    )

    /**
     * Adding dependency on lexemeIndex as the fetch for thought is async await.
     * ThoughtAnnotation wasn't waiting for all the lexemeIndex to be set before it was rendered.
     * And hence the superscript wasn't rendering properly on load.
     * So now subscribing to get context so that StaticSuperscript is not re-rendered for all lexemeIndex change.
     * It will re-render only when respective Lexeme is changed.
     * Changed as part of fix for issue 1419 (https://github.com/cybersemics/em/issues/1419).
     */

    const textMarkup = useSelector(state => {
      const labelId = findDescendant(state, head(simplePath), '=label')
      const labelChild = anyChild(state, labelId || undefined)
      return isEditing ? (liveValueIfEditing ?? value) : labelChild ? labelChild.value : value
    })

    return (
      <ThoughtAnnotationWrapper
        isTableCol1={isTableCol1}
        ellipsizedUrl={ellipsizedUrl}
        multiline={multiline}
        value={value}
        styleAnnotation={styleAnnotation}
        cssRaw={cssRaw}
        style={style}
        textMarkup={textMarkup}
        placeholder={placeholder}
      >
        {
          // do not render url icon on root thoughts in publish mode
          url && !(publishMode() && simplePath.length === 1) && <UrlIconLink isVisible={isVisible} url={url} />
        }
        {email && <EmailIconLink email={email} />}
        {
          // with real time context update we increase context length by 1 // with the default minContexts of 2, do not count the whole thought
          showSuperscript ? (
            <StaticSuperscript absolute n={numContexts} style={style} cssRaw={cssRaw} thoughtId={head(simplePath)} />
          ) : null
        }
        <span className={css({ fontSize: '1.25em', margin: '-0.3625em 0 0 -0.0875em', position: 'absolute' })}>
          <FauxCaret caretType='thoughtEnd' />
        </span>
      </ThoughtAnnotationWrapper>
    )
  },
)
/** Container for ThoughtAnnotation. */
const ThoughtAnnotationContainer = React.memo(
  ({
    isVisible,
    path,
    simplePath,
    minContexts = 2,
    multiline,
    ellipsizedUrl,
    placeholder,
    invalidState,
    cssRaw,
    style,
    // only applied to the .subthought container
    styleAnnotation,
  }: {
    env?: LazyEnv
    focusOffset?: number
    invalidState?: boolean
    isVisible?: boolean
    minContexts?: number
    multiline?: boolean
    ellipsizedUrl?: boolean
    path: Path
    placeholder?: string
    showContextBreadcrumbs?: boolean
    simplePath: SimplePath
    cssRaw?: SystemStyleObject
    style?: React.CSSProperties
    styleAnnotation?: React.CSSProperties
  }) => {
    // delay calculation of contexts for performance
    // recalculate after the component has mounted
    // filtering on isNotArchive is very slow: O(totalNumberOfContexts * depth)
    const [calculateContexts, setCalculateContexts] = useState(false)

    const value: string | undefined = useSelector(state => {
      const thought = getThoughtById(state, head(path))
      return thought?.value || ''
    })

    const isEditing = useSelector(state => equalPath(state.cursor, path))
    const invalidStateIfEditing = useMemo(() => isEditing && invalidState, [isEditing, invalidState])

    const liveValueIfEditing = editingValueStore.useSelector((editingValue: string | null) =>
      isEditing ? editingValue : null,
    )

    // if a thought has the same value as editValue, re-render its ThoughtAnnotation in order to get the correct number of contexts
    editingValueStore.useSelector((editingValue: string | null) => value === editingValue)

    const hideSuperscriptsSetting = useSelector(getUserSetting(Settings.hideSuperscripts))

    const isExpanded = useSelector(state => !!state.expanded[hashPath(simplePath)])

    const numContexts = useSelector(
      moize(
        (state: State): number => {
          if (!calculateContexts || hideSuperscriptsSetting) return 0

          // only show real time update if being edited while having meta validation error
          // do not increase numContexts when in an invalid state since the thought has not been updated in state
          const isRealTimeContextUpdate = isEditing && invalidStateIfEditing && liveValueIfEditing !== null

          const contexts = getContexts(state, isRealTimeContextUpdate ? liveValueIfEditing! : value)
          return value === ''
            ? 0
            : contexts.filter(id => isVisibleContext(state, id)).length + (isRealTimeContextUpdate ? 1 : 0)
        },
        {
          maxSize: 1000,
          profileName: 'numContexts',
          transformArgs: ([state]) => {
            const isRealTimeContextUpdate = isEditing && invalidStateIfEditing && liveValueIfEditing !== null
            return [resolveArray(getContexts(state, isRealTimeContextUpdate ? liveValueIfEditing! : value))]
          },
        },
      ),
    )

    const showSuperscript =
      !hideSuperscriptsSetting &&
      (REGEX_PUNCTUATIONS.test(value.replace(REGEX_TAGS, '')) ? false : minContexts === 0 || numContexts > 1)

    const url = useSelector(state => {
      const childrenUrls = filterAllChildren(state, head(simplePath), child => containsURL(child.value))
      const urlValue = containsURL(value)
        ? value
        : // if the only subthought is a url and the thought is not expanded, link the thought
          !isExpanded && childrenUrls.length === 1 && (!state.cursor || !equalPath(simplePath, parentOf(state.cursor)))
          ? childrenUrls[0].value
          : null
      return urlValue ? stripTags(urlValue) : urlValue
    })

    const email = isEmail(value) ? value : undefined

    // if a thought has the same value as editValue, re-render its ThoughtAnnotation in order to get the correct number of contexts
    editingValueStore.useSelector((editingValue: string | null) => value === editingValue)

    useEffect(() => {
      setCalculateContexts(true)
    }, [])

    // In order to render a faux caret while hideCaret animations are playing, ThoughtAnnotation always needs
    // to exist on mobile Safari. The line end faux caret must be placed inline-block at the end of the
    // thought text in order to cover cases where the selection is an ELEMENT_NODE and its bounding box
    // does not represent the screen position of the caret.
    return showSuperscript || url || email || styleAnnotation || (isTouch && isSafari()) ? (
      <ThoughtAnnotation
        {...{
          simplePath,
          isEditing,
          isVisible,
          multiline,
          ellipsizedUrl: ellipsizedUrl,
          numContexts,
          showSuperscript,
          cssRaw,
          style,
          styleAnnotation,
          email,
          placeholder,
          url,
          value,
        }}
      />
    ) : null
  },
)

ThoughtAnnotationContainer.displayName = 'ThoughtAnnotationContainer'
ThoughtAnnotation.displayName = 'ThoughtAnnotation'

export default ThoughtAnnotationContainer
