import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { store } from '../store'
import { REGEXP_PUNCTUATIONS } from '../constants'
import { decodeThoughtsUrl, getContexts, getAllChildren, theme } from '../selectors'
import { State } from '../util/initialState'
import { Connected, Context, SimplePath, ThoughtContext, Path } from '../types'

// util
import {
  parentOf,
  ellipsizeUrl,
  equalPath,
  // getOffsetWithinContent,
  head,
  headValue,
  pathToContext,
  publishMode,
} from '../util'

// components
import HomeLink from './HomeLink'
import StaticSuperscript from './StaticSuperscript'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import UrlIcon from './icons/UrlIcon'

interface ThoughtAnnotationProps {
  thoughtsResolved: Path,
  dark?: boolean,
  editingValue?: string | null,
  focusOffset?: number,
  homeContext?: boolean,
  invalidState?: boolean | null,
  isEditing?: boolean,
  minContexts?: number,
  showContextBreadcrumbs?: boolean,
  showContexts?: boolean,
  showHiddenThoughts?: boolean,
  style?: React.CSSProperties,
  path: SimplePath,
  url?: string | null,
}

/** Sets the innerHTML of the subthought text. */
const getSubThoughtTextMarkup = (state: State, isEditing: boolean, subthought: { text: string }, thoughts: Context) => {
  const labelChildren = getAllChildren(state, [...thoughts, '=label'])
  const { editingValue } = state
  return {
    __html: isEditing
      ? editingValue && subthought.text !== editingValue ? editingValue : subthought.text
      : labelChildren.length > 0
        ? labelChildren[0].value
        : ellipsizeUrl(subthought.text)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: ThoughtAnnotationProps) => {

  const { cursor, cursorBeforeEdit, invalidState, editingValue, showHiddenThoughts } = state

  const isEditing = equalPath(cursorBeforeEdit, props.thoughtsResolved)
  const pathLive = isEditing
    ? parentOf(props.path).concat(head(props.showContexts ? parentOf(cursor!) : cursor!)) as SimplePath
    : props.path

  return {
    dark: theme(state) !== 'Light',
    editingValue: isEditing ? editingValue : null,
    invalidState: isEditing ? invalidState : null,
    isEditing,
    showHiddenThoughts,
    path: pathLive,
  }
}

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
const ThoughtAnnotation = ({ path, showContexts, showContextBreadcrumbs, homeContext, isEditing, minContexts = 2, url, dispatch, invalidState, editingValue, style, showHiddenThoughts }: Connected<ThoughtAnnotationProps>) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection

  // only show real time update if being edited while having meta validation error
  // do not increase numContexts when in an invalid state since the thought has not been updated in state
  const isRealTimeContextUpdate = isEditing && invalidState && editingValue !== null

  const value = headValue(showContexts ? parentOf(path) : path)
  const state = store.getState()
  const subthoughts = /* getNgrams(value, 3) */value ? [{
    text: value,
    contexts: getContexts(state, isRealTimeContextUpdate ? editingValue! : value)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))
  const thoughts = pathToContext(path)

  /** Adds https to the url if it is missing. Ignores urls at localhost. */
  const addMissingProtocol = (url: string) => (
    !url.startsWith('http:') &&
    !url.startsWith('https:') &&
    !url.startsWith('localhost:')
      ? 'https://'
      : ''
  ) + url

  /** Returns true if the thought is not archived. */
  const isNotArchive = (thoughtContext: ThoughtContext) =>
    // thoughtContext.context should never be undefined, but unfortunately I have personal thoughts in production with no context. I am not sure whether this was old data, or if it's still possible to encounter, so guard against undefined context for now.
    showHiddenThoughts || !thoughtContext.context || thoughtContext.context.indexOf('=archive') === -1

  /** A Url icon that links to the url. */
  const UrlIconLink = ({ url }: { url: string }) => <a href={addMissingProtocol(url)} rel='noopener noreferrer' target='_blank' className='external-link' onClick={e => {
    if (url.startsWith(window.location.origin)) {
      const { path, contextViews } = decodeThoughtsUrl(store.getState(), url.slice(window.location.origin.length))
      dispatch({ type: 'setCursor', path, replaceContextViews: contextViews })
      e.preventDefault()
    }
  }}
  >
    <UrlIcon />
  </a>
  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : {}}>

    {showContextBreadcrumbs ? <ContextBreadcrumbs simplePath={parentOf(parentOf(path))} showContexts={showContexts} /> : null}

    {homeContext
      ? <HomeLink/>
      : subthoughts.map((subthought, i) => {

        const numContexts = subthought.contexts.filter(isNotArchive).length + (isRealTimeContextUpdate ? 1 : 0)
        return <React.Fragment key={i}>
          {i > 0 ? ' ' : null}
          <div className={classNames({
            subthought: true,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}>
            <span className='subthought-text' style={style} dangerouslySetInnerHTML={getSubThoughtTextMarkup(state, !!isEditing, subthought, thoughts)} />
            { // do not render url icon on root thoughts in publish mode
              url && !(publishMode() && path.length === 1) && <UrlIconLink url={url} />}
            {REGEXP_PUNCTUATIONS.test(subthought.text)
              ? null
              // with the default minContexts of 2, do not count the whole thought
              // with real time context update we increase context length by 1
              : minContexts === 0 || numContexts > (subthought.text === value ? 1 : 0)
                ? <StaticSuperscript n={numContexts} />
                : null
            }
          </div>
        </React.Fragment>
      })
    }
  </div>
}

export default connect(mapStateToProps)(ThoughtAnnotation)
