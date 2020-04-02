import React from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'

import {
  EM_TOKEN,
} from '../constants.js'

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
  unroot,
} from '../util.js'

// components
import HomeLink from './HomeLink.js'
import StaticSuperscript from './StaticSuperscript.js'
import ContextBreadcrumbs from './ContextBreadcrumbs.js'

const mapStateToProps = ({ cursor, cursorBeforeEdit, focusOffset, invalidState, editingValue }, props) => {

  // reerender annotation in realtime when thought is edited
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
  const thoughtsRankedLive = isEditing
    ? contextOf(props.thoughtsRanked).concat(head(props.showContexts ? contextOf(cursor) : cursor))
    : props.thoughtsRanked

  return {
    dark: !meta([EM_TOKEN, 'Settings', 'Theme']).Light,
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
            {url
            // eslint-disable-next-line no-undef
              ? <a href={(!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('localhost:') ? 'https://' : '') + url} rel="noopener noreferrer" target='_blank' className='external-link' onClick={e => {
                if (url.startsWith(window.location.origin)) {
                  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(url.slice(window.location.origin.length))
                  dispatch({ type: 'setCursor', thoughtsRanked, replaceContextViews: contextViews })
                  e.preventDefault()
                }
              }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                  width="18" height="18"
                  viewBox="0 0 30 30"
                  style={{
                    marginLeft: '2px',
                    marginTop: '-4px',
                    padding: '3px 3px 3px 1px',
                    cursor: 'pointer',
                    pointerEvents: 'all'
                  }}
                ><path
                    fill='#838283'
                    d="M 25.980469 2.9902344 A 1.0001 1.0001 0 0 0 25.869141 3 L 20 3 A 1.0001 1.0001 0 1 0 20 5 L 23.585938 5 L 13.292969 15.292969 A 1.0001 1.0001 0 1 0 14.707031 16.707031 L 25 6.4140625 L 25 10 A 1.0001 1.0001 0 1 0 27 10 L 27 4.1269531 A 1.0001 1.0001 0 0 0 25.980469 2.9902344 z M 6 7 C 4.9069372 7 4 7.9069372 4 9 L 4 24 C 4 25.093063 4.9069372 26 6 26 L 21 26 C 22.093063 26 23 25.093063 23 24 L 23 14 L 23 11.421875 L 21 13.421875 L 21 16 L 21 24 L 6 24 L 6 9 L 14 9 L 16 9 L 16.578125 9 L 18.578125 7 L 16 7 L 14 7 L 6 7 z">
                  </path>
                </svg>
              </a>
              : null
            }
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
