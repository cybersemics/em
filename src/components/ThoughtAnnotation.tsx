import moize from 'moize'
import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import { SystemStyleObject } from '../../styled-system/types'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isSafari, isTouch } from '../browser'
import { REGEX_PUNCTUATIONS, REGEX_TAGS, Settings } from '../constants'
import useContextAnimation from '../hooks/useContextAnimation'
import attributeEquals from '../selectors/attributeEquals'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import { filterAllChildren } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import editingValueStore from '../stores/editingValue'
import viewportStore from '../stores/viewport'
import containsURL from '../util/containsURL'
import durations from '../util/durations'
import equalPath from '../util/equalPath'
import fastClick from '../util/fastClick'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isDescendantPath from '../util/isDescendantPath'
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
const UrlIconLink = React.memo(({ url }: { url: string }) => {
  const dispatch = useDispatch()
  return (
    <a
      href={addMissingProtocol(url)}
      rel='noopener noreferrer'
      target='_blank'
      className={urlLinkStyle}
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
    annotationRef,
    email,
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
    value,
  }: {
    annotationRef: RefObject<HTMLDivElement | null>
    email?: string
    multiline?: boolean
    ellipsizedUrl?: boolean
    numContexts: number
    showSuperscript?: boolean
    simplePath: SimplePath
    cssRaw?: SystemStyleObject
    style?: React.CSSProperties
    styleAnnotation?: React.CSSProperties
    url?: string | null
    value: string
  }) => {
    const isTableCol1 = useSelector((state: State) =>
      attributeEquals(state, head(rootedParentOf(state, simplePath)), '=view', 'Table'),
    )

    return (
      <>
        <span
          className={css({
            fontSize: '1.25em',
            margin: '-0.375em 0 0 0.1375em',
            position: 'absolute',
          })}
        >
          <FauxCaret caretType='thoughtStart' />
        </span>
        <ThoughtAnnotationWrapper
          annotationRef={annotationRef}
          isTableCol1={isTableCol1}
          ellipsizedUrl={ellipsizedUrl}
          multiline={multiline}
          value={value}
          styleAnnotation={styleAnnotation}
        >
          {
            // do not render url icon on root thoughts in publish mode
            url && !(publishMode() && simplePath.length === 1) && <UrlIconLink url={url} />
          }
          {email && <EmailIconLink email={email} />}
          {
            // with real time context update we increase context length by 1 // with the default minContexts of 2, do not count the whole thought
            showSuperscript ? (
              <StaticSuperscript
                absolute
                n={numContexts}
                style={style}
                cssRaw={cssRaw}
                multiline={multiline}
                thoughtId={head(simplePath)}
              />
            ) : null
          }
          <span className={css({ fontSize: '1.25em', margin: '-0.3625em 0 0 -0.0875em', position: 'absolute' })}>
            <FauxCaret caretType='thoughtEnd' />
          </span>
        </ThoughtAnnotationWrapper>
      </>
    )
  },
)
/** Container for ThoughtAnnotation. */
const ThoughtAnnotationContainer = React.memo(
  ({
    editableRef,
    path,
    simplePath,
    minContexts = 2,
    isTableCol1,
    multiline,
    ellipsizedUrl,
    invalidState,
    cssRaw,
    style,
    // only applied to the .subthought container
    styleAnnotation,
  }: {
    editableRef: RefObject<HTMLInputElement | null>
    env?: LazyEnv
    focusOffset?: number
    invalidState?: boolean
    isTableCol1?: boolean
    minContexts?: number
    multiline?: boolean
    ellipsizedUrl?: boolean
    path: Path
    showContextBreadcrumbs?: boolean
    simplePath: SimplePath
    cssRaw?: SystemStyleObject
    style?: React.CSSProperties
    styleAnnotation?: React.CSSProperties
  }) => {
    const annotationRef = useRef<HTMLDivElement>(null)
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

    // We're trying to get rid of contentWidth as part of #3369, but currently it's the easiest reactive proxy for a viewport resize event.
    const contentWidth = viewportStore.useSelector(state => state.contentWidth)
    const fontSize = useSelector(state => state.fontSize)

    // if a thought has the same value as editValue, re-render its ThoughtAnnotation in order to get the correct number of contexts
    editingValueStore.useSelector((editingValue: string | null) => value === editingValue)

    const hideSuperscriptsSetting = useSelector(getUserSetting(Settings.hideSuperscripts))

    const isExpanded = useSelector(state => !!state.expanded[hashPath(simplePath)])
    const isInContextView = useSelector(state => isContextViewActive(state, parentOf(path)))

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

    const positionAnnotation = useCallback(() => {
      if (editableRef.current && annotationRef.current) {
        const range = document.createRange()
        const textNode = editableRef.current.lastChild

        const length = textNode && textNode.nodeType === Node.TEXT_NODE && textNode.textContent?.length
        const offset = editableRef.current.getBoundingClientRect()

        let right = offset.width - fontSize - (length ? fontSize / 3 : 0)
        let top = 0

        if (length) {
          // Select the last character
          range.setStart(textNode, length - 1)
          range.setEnd(textNode, length)

          // Get bounding box
          const rect = range.getBoundingClientRect()
          const isAtEdge = rect.right - offset.left > offset.width

          top = rect.top - offset.top
          // offset annotation container to account for -12px left margin in ThoughtPositioner #3352
          if (!isAtEdge) right = rect.right - offset.left + (isTableCol1 ? 12 : 0)
        }

        // rect.right gives you the x position (relative to viewport)
        annotationRef.current.style.left = `${right}px`
        annotationRef.current.style.top = `${top}px`
        annotationRef.current.style.opacity = '1'
      }
    }, [editableRef, fontSize, isTableCol1])

    const contextAnimation = useContextAnimation(path)
    const descendant = useSelector(state => isDescendantPath(path, state.cursor))

    // useSelector would be a cleaner way to get the annotationRef's new position
    // but, on load, the refs are null until setTimeout runs
    useEffect(() => {
      if (contextAnimation && descendant && !isEditing && annotationRef.current)
        annotationRef.current.style.opacity = '0'
      setTimeout(positionAnnotation, contextAnimation ? durations.get(contextAnimation) : 0)
    }, [
      contentWidth,
      contextAnimation,
      descendant,
      editableRef,
      email,
      fontSize,
      isEditing,
      isInContextView,
      isTableCol1,
      numContexts,
      positionAnnotation,
      showSuperscript,
      styleAnnotation,
      url,
    ])

    // In order to render a faux caret while hideCaret animations are playing, ThoughtAnnotation always needs
    // to exist on mobile Safari. The line end faux caret must be placed inline-block at the end of the
    // thought text in order to cover cases where the selection is an ELEMENT_NODE and its bounding box
    // does not represent the screen position of the caret.
    return showSuperscript || url || email || styleAnnotation || (isTouch && isSafari()) ? (
      <ThoughtAnnotation
        {...{
          annotationRef,
          simplePath,
          isEditing,
          multiline,
          ellipsizedUrl: ellipsizedUrl,
          numContexts,
          showSuperscript,
          cssRaw,
          style,
          styleAnnotation,
          email,
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
