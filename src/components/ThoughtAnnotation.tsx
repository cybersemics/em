import moize from 'moize'
import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { multilineRecipe } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'
import LazyEnv from '../@types/LazyEnv'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isSafari, isTouch } from '../browser'
import { REGEX_PUNCTUATIONS, REGEX_TAGS, Settings } from '../constants'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import findDescendant from '../selectors/findDescendant'
import { anyChild, filterAllChildren } from '../selectors/getChildren'
import getContexts from '../selectors/getContexts'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import editingValueStore from '../stores/editingValue'
import containsURL from '../util/containsURL'
import equalPath from '../util/equalPath'
import fastClick from '../util/fastClick'
import hashPath from '../util/hashPath'
import head from '../util/head'
import isAttribute from '../util/isAttribute'
import isEmail from '../util/isEmail'
import isVisibleContext from '../util/isVisibleContext'
import parentOf from '../util/parentOf'
import publishMode from '../util/publishMode'
import resolveArray from '../util/resolveArray'
import stripTags from '../util/stripTags'
import StaticSuperscript from './StaticSuperscript'
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
    email,
    isEditing,
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
    isEditing?: boolean
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
      <div
        aria-label='thought-annotation'
        className={css({
          position: 'absolute',
          pointerEvents: 'none',
          userSelect: 'none',
          boxSizing: 'border-box',
          width: '100%',
          // maxWidth: '100%',
          marginTop: '0',
          display: 'inline-block',
          verticalAlign: 'top',
          whiteSpace: 'pre-wrap',
          /* override editable-annotation's single line to have same width with .editable. 100% - 1em since .editable has padding-right 1em */
          maxWidth: ellipsizedUrl ? 'calc(100% - 2em)' : '100%',
          '@media (max-width: 500px)': {
            marginTop: { _android: '-2.1px' },
            marginLeft: { _android: '0.5em' },
          },
          '@media (min-width: 560px) and (max-width: 1024px)': {
            marginTop: { _android: '-0.1px' },
            marginLeft: { _android: '0.5em' },
          },
        })}
      >
        <div
          className={
            cx(
              multiline ? multilineRecipe() : null,
              css({
                ...(isAttribute(value) && {
                  backgroundColor: 'thoughtAnnotation',
                  fontFamily: 'monospace',
                }),
                display: 'inline-block',
                maxWidth: '100%',
                padding: '0 0.333em',
                boxSizing: 'border-box',
                whiteSpace: ellipsizedUrl ? 'nowrap' : undefined,
                /*
                  Since .editable-annotation-text is display: inline the margin only gets applied to its first line, and not later lines.
                  To make sure all lines are aligned need to apply the margin here, and remove margin from the .editable-annotation-text
                */
                margin: '-0.5px 0 0 calc(1em - 18px)',
                paddingRight: multiline ? '1em' : '0.333em',
              }),
            )
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
            // .subthought-highlight {
            //   border-bottom: solid 1px;
            // }
          }
          style={styleAnnotation}
        >
          <span
            className={css(
              {
                visibility: 'hidden',
                position: 'relative',
                clipPath: 'inset(0.001px 0 0.1em 0)',
                wordBreak: 'break-word',
                ...(ellipsizedUrl && {
                  display: 'inline-block',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                  /*
                    vertical-align: top; - This fixes the height difference problem of .thought-annotation and .thought
                    Here is the reference to the reason.
                    https://stackoverflow.com/questions/20310690/overflowhidden-on-inline-block-adds-height-to-parent
                */
                  verticalAlign: 'top',
                }),
              },
              cssRaw,
            )}
            style={style}
            dangerouslySetInnerHTML={{ __html: textMarkup || placeholder || '' }}
          />
          {
            // do not render url icon on root thoughts in publish mode
            url && !(publishMode() && simplePath.length === 1) && <UrlIconLink url={url} />
          }
          {email && <EmailIconLink email={email} />}
          {
            // with real time context update we increase context length by 1 // with the default minContexts of 2, do not count the whole thought
            showSuperscript ? <StaticSuperscript absolute n={numContexts} style={style} cssRaw={cssRaw} /> : null
          }
          <span
            className={css({
              bottom: '6px',
              color: 'blue',
              fontSize: '1.25em',
              opacity: 'var(--faux-caret-line-end-opacity)',
              position: 'relative',
              pointerEvents: 'none',
              right: '2px',
              WebkitTextStroke: '0.625px var(--colors-blue)',
            })}
          >
            |
          </span>
        </div>
      </div>
    )
  },
)
/** Container for ThoughtAnnotation. */
const ThoughtAnnotationContainer = React.memo(
  ({
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
        (state: State) => {
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

    return showSuperscript || url || email || styleAnnotation || (isTouch && isSafari()) ? (
      <ThoughtAnnotation
        {...{
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
