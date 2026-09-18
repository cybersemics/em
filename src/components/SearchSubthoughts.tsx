import pluralize from 'pluralize'
import { FC } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css, cx } from '../../styled-system/css'
import { textNoteRecipe } from '../../styled-system/recipes'
import Thought from '../@types/Thought'
import { searchLimitActionCreator as setSearchLimit } from '../actions/searchLimit'
import { EM_TOKEN, HOME_PATH, HOME_TOKEN } from '../constants'
import hasLexeme from '../selectors/hasLexeme'
import store from '../stores/app'
import escapeRegex from '../util/escapeRegex'
import fastClick from '../util/fastClick'
import isDocumentEditable from '../util/isDocumentEditable'
import sort from '../util/sort'
import NewThought from './NewThought'

/** Number of thoughts to limit the search results to by default. */
const DEFAULT_SEARCH_LIMIT = 20

/** Subthoughts of search. */
const SearchSubthoughts: FC = () => {
  const dispatch = useDispatch()
  const search = useSelector(state => state.search)
  const searchLimit = useSelector(state => state.searchLimit || DEFAULT_SEARCH_LIMIT)
  const thoughtIndex = useSelector(state => state.thoughts.thoughtIndex)

  if (!search) return null

  const searchRegexp = new RegExp(escapeRegex(search), 'gi')

  /** Compares two values lexicographically, sorting exact matches to the top. */
  const comparator = (a: Thought, b: Thought) => {
    const aLower = a.value.toLowerCase()
    const bLower = b.value.toLowerCase()
    const searchLower = search.toLowerCase()
    // 1. exact match
    return bLower === searchLower
      ? 1
      : aLower === searchLower
        ? -1
        : // 2. starts with search
          bLower.startsWith(searchLower)
          ? 1
          : aLower.startsWith(searchLower)
            ? -1
            : // 3. lexicographic
              a > b
              ? 1
              : b > a
                ? -1
                : 0
  }

  const children = search
    ? sort(
        Object.values(thoughtIndex).filter(
          thought =>
            // (archived || !isArchived(store.getState(), lexeme)) &&
            thought.value !== HOME_TOKEN && thought.value !== EM_TOKEN && searchRegexp.test(thought.value),
        ),
        comparator,
      )
    : []

  return (
    <div>
      {!hasLexeme(store.getState(), search) && isDocumentEditable() ? (
        <NewThought path={HOME_PATH} label={`Create "${search}"`} value={search} type='button' />
      ) : null}
      <span className={cx(textNoteRecipe(), css({ fontSize: 'sm' }))}>
        {pluralize('match', children.length, true)} for "{search}"
      </span>
      {/* TODO: VirtualTree */}
      {/* <Subthoughts
        childrenForced={children.slice(0, searchLimit).map(({ id }) => id)}
        simplePath={HOME_PATH}
        allowSingleContextParent={true}
        expandable={true}
      /> */}
      {children.length > DEFAULT_SEARCH_LIMIT ? (
        <a
          className={cx(textNoteRecipe(), css({ display: 'inline-block', marginTop: '5px', marginLeft: '18px' }))}
          {...fastClick(() => dispatch(setSearchLimit({ value: searchLimit + DEFAULT_SEARCH_LIMIT })))}
        >
          More...
        </a>
      ) : null}
    </div>
  )
}

export default SearchSubthoughts
