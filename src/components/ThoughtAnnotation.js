import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'

// components
import { HomeLink } from './HomeLink.js'
import { StaticSuperscript } from './StaticSuperscript.js'
import { ContextBreadcrumbs } from './ContextBreadcrumbs.js'

// util
import {
  chain,
  contextOf,
  decodeThoughtsUrl,
  equalPath,
  getContexts,
  head,
  headValue,
  restoreSelection,
  unroot,
  ellipsizeUrl
} from '../util.js'

/** A non-interactive annotation overlay that contains intrathought links (superscripts and underlining). */
export const ThoughtAnnotation = connect(({ cursor, cursorBeforeEdit, focusOffset, settings: { dark } = {} }, props) => {

  // reerender annotation in realtime when thought is edited
  const thoughtsResolved = props.contextChain && props.contextChain.length > 0
    ? chain(props.contextChain, props.thoughtsRanked)
    : unroot(props.thoughtsRanked)
  const isEditing = equalPath(cursorBeforeEdit, thoughtsResolved)
  const thoughtsRankedLive = isEditing
    ? contextOf(props.thoughtsRanked).concat(head(props.showContexts ? contextOf(cursor) : cursor))
    : props.thoughtsRanked

  return {
    dark,
    thoughtsRanked: thoughtsRankedLive,
    isEditing,
    focusOffset
  }
})(({ dark, thoughtsRanked, showContexts, showContextBreadcrumbs, contextChain, homeContext, isEditing, focusOffset, minContexts = 2, url, dispatch }) => {

  // disable intrathought linking until add, edit, delete, and expansion can be implemented
  // get all subthoughts and the subthought under the selection
  const value = headValue(showContexts ? contextOf(thoughtsRanked) : thoughtsRanked)
  const subthoughts = /* getSubthoughts(value, 3) */value ? [{
    text: value,
    contexts: getContexts(value)
  }] : []
  // const subthoughtUnderSelection = perma(() => findSubthoughtByIndex(subthoughts, focusOffset))

  return <div className='thought-annotation' style={homeContext ? { height: '1em', marginLeft: 8 } : null}>

    {showContextBreadcrumbs ? <ContextBreadcrumbs thoughtsRanked={contextOf(contextOf(thoughtsRanked))} showContexts={showContexts} /> : null}

    {homeContext
      ? <HomeLink/>
      : subthoughts.map((subthought, i) => {

        return <React.Fragment key={i}>
          {i > 0 ? ' ' : null}
          <span className={classNames({
            subthought: true,
            // disable intrathought linking until add, edit, delete, and expansion can be implemented
            // 'subthought-highlight': isEditing && focusOffset != null && subthought.contexts.length > (subthought.text === value ? 1 : 0) && subthoughtUnderSelection() && subthought.text === subthoughtUnderSelection().text
          })}>
            <span className='subthought-text'>{isEditing ? subthought.text : ellipsizeUrl(subthought.text)}</span>
          </span>
          { // with the default minContexts of 2, do not count the whole thought
            minContexts === 0 || subthought.contexts.length > (subthought.text === value ? 1 : 0)
            ? <StaticSuperscript n={subthought.contexts.length} />
            : null
          }
          {url
            // eslint-disable-next-line no-undef
            ? <a href={(!url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('localhost:') ? 'https://' : '') + url} rel="noopener noreferrer" target='_blank' className='external-link' onClick={e => {
                if (url.startsWith(window.location.origin)) {
                  const { thoughtsRanked, contextViews } = decodeThoughtsUrl(url.slice(window.location.origin.length))
                  dispatch({ type: 'setCursor', thoughtsRanked, replaceContextViews: contextViews })
                  restoreSelection(thoughtsRanked, { offset: 0 })
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
        </React.Fragment>
      })
    }
  </div>
})
