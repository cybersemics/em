import React, { FC } from 'react'
import { connect } from 'react-redux'

import { ABSOLUTE_PATH, HOME_PATH } from '../constants'
import { getSetting, getAllChildren, isTutorial, getSortPreference } from '../selectors'
import { isAbsolute } from '../util'

// components
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'
import { childrenFilterPredicate } from '../selectors/getChildren'
import Editable from './Editable'
import { SimplePath, State } from '../@types'
import { storage } from '../util/storage'
import { ScrollView } from 'react-native'
import { commonStyles } from '../style/commonStyles'

const tutorialLocal = storage.getItem('Settings/Tutorial') === 'On'
const tutorialStepLocal = +(storage.getItem('Settings/Tutorial Step') || 1)

const transientChildPath = [
  {
    value: '',
    rank: 0,
  },
] as SimplePath

/*
  Transient Editable represents a child that is yet not in the state.
  But as soon as user types it adds the child to the state with the new value and vanishes.
  However removing the transient editable should be handled by some business logic by parent components.
*/
const TransientEditable = (
  <Editable transient={true} path={transientChildPath} simplePath={transientChildPath} rank={0} />
)

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { isLoading, noteFocus, search, showModal, rootContext } = state

  const isTutorialLocal = isLoading ? tutorialLocal : isTutorial(state)

  const tutorialStep = isLoading ? tutorialStepLocal : +(getSetting(state, 'Tutorial Step') ?? 1)

  const isAbsoluteContext = isAbsolute(rootContext)
  const children = getAllChildren(state, rootContext)

  const rankedRoot = isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH
  const rootThoughtsLength = children.filter(childrenFilterPredicate(state, rankedRoot, [], false)).length

  // pass rootSort to allow root Subthoughts to render on toggleSort
  // pass scalar components to avoid re-render from object reference change
  const { type: rootSortType, direction: rootSortDirection } = getSortPreference(state, rootContext)

  return {
    search,
    showModal,
    isTutorialLocal,
    tutorialStep,
    rootThoughtsLength,
    noteFocus,
    rootSortDirection,
    rootSortType,
    isAbsoluteContext,
    rootContext,
  }
}

interface IComponentProps {
  scrollEnabled: boolean
}

type ContentComponent = FC<ReturnType<typeof mapStateToProps> & IComponentProps>

/** The main content section of em. */
const Content: ContentComponent = props => {
  const {
    search,
    isTutorialLocal,
    rootThoughtsLength,
    rootSortDirection,
    rootSortType,
    isAbsoluteContext,
    scrollEnabled,
  } = props

  return (
    <ScrollView scrollEnabled={scrollEnabled} nestedScrollEnabled style={commonStyles.flexOne}>
      {search != null ? (
        <Search />
      ) : (
        <>
          {rootThoughtsLength === 0 ? (
            isAbsoluteContext ? (
              TransientEditable
            ) : (
              <NewThoughtInstructions childrenLength={rootThoughtsLength} isTutorial={isTutorialLocal} />
            )
          ) : (
            <Subthoughts
              simplePath={isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH}
              expandable={true}
              sortDirection={rootSortDirection}
              sortType={rootSortType}
            />
          )}
        </>
      )}
    </ScrollView>
  )
}

export default connect(mapStateToProps)(Content)
