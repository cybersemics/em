import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'

// util
import {
  chain,
  contextOf,
  decodeThoughtsUrl,
  ellipsizeUrl,
  equalPath,
  getContexts,
  head,
  headValue,
  meta,
  pathToContext,
  publishMode,
  unroot,
} from '../util'

// selectors
import theme from '../selectors/theme'

// components
import HomeLink from './HomeLink'
import StaticSuperscript from './StaticSuperscript'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import UrlIcon from './icons/UrlIcon'

const mapStateToProps = (state, props) => {

  const { cursor, cursorBeforeEdit, focusOffset, invalidState, editingValue } = state

  // reerender annotation in realtime when thought is edited
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
  const thoughtsRankedLive = isEditing
    ? contextOf(props.thoughtsRanked).concat(head(props.showContexts ? contextOf(cursor) : cursor))
    : props.thoughtsRanked

  return {
    dark: theme(state) !== 'Light',
    editingValue: isEditing ? editingValue : null,
    focusOffset,
    invalidState: isEditing ? invalidState : null,
    isEditing,
    thoughtsRanked: thoughtsRankedLive,
  }
}

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
const ThoughtAnnotation = ({ dark, thoughtsRanked, showContexts, showContextBreadcrumbs, contextChain, homeContext, isEditing, focusOffset, minContexts = 2, url, dispatch, invalidState, editingValue }) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection

  // only show real time update if being edited while having meta validation error
  // do not increase numContexts when in an invalid state since the thought has not been updated in state
  const isRealTimeContextUpdate = isEditing && invalidState && editingValue !== null

  const value = headValue(showContexts ? contextOf(thoughtsRanked) : thoughtsRanked)

  const subthoughts = /* getNgrams(value, 3) */value ? [{
    text: value,
    contexts: getContexts(isRealTimeContextUpdate ? editingValue : value)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))
  const thoughtMeta = meta(pathToContext(thoughtsRanked))

  const addMissingProtocol = url => (
    !url.startsWith('http:') &&
    !url.startsWith('https:') &&
    !url.startsWith('localhost:')
      ? 'https://'
      : ''
  ) + url

  const UrlIconLink = () => <a href={addMissingProtocol(url)} rel="noopener noreferrer" target='_blank' className='external-link' onClick={e => {
    if (url.startsWith(window.location.origin)) {
      const { thoughtsRanked, contextViews } = decodeThoughtsUrl(url.slice(window.location.origin.length))
      dispatch({ type: 'setCursor', thoughtsRanked, replaceContextViews: contextViews })
      e.preventDefault()
    }
  }}
  >
    <UrlIcon />
  </a>

  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

    {showContextBreadcrumbs ? <ContextBreadcrumbs thoughtsRanked={contextOf(contextOf(thoughtsRanked))} showContexts={showContexts} /> : null}

    {homeContext
      ? <HomeLink/>
      : subthoughts.map((subthought, i) => {

        const numContexts = subthought.contexts.length + (isRealTimeContextUpdate ? 1 : 0)

        return <React.Fragment key={i}>
          {i > 0 ? ' ' : null}
          <div className={classNames({
            subthought: true,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}>
            <span className='subthought-text'>{isEditing
              ? subthought.text
              : thoughtMeta && thoughtMeta.label
                ? Object.keys(thoughtMeta.label)[0]
                : ellipsizeUrl(subthought.text)
            }
            </span>
            { // do not render url icon on root thoughts in publish mode
              url && !(publishMode() && thoughtsRanked.length === 1) && <UrlIconLink />}
            { // with the default minContexts of 2, do not count the whole thought
            // with real time context update we increase context length by 1
              minContexts === 0 || numContexts > (subthought.text === value ? 1 : 0)
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
