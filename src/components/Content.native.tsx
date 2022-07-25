import React, { FC } from 'react'
import { ScrollView } from 'react-native'
import { connect } from 'react-redux'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import { ABSOLUTE_PATH, HOME_PATH } from '../constants'
import { childrenFilterPredicate, getAllChildrenAsThoughts } from '../selectors/getChildren'
import getSetting from '../selectors/getSetting'
import isTutorial from '../selectors/isTutorial'
import { commonStyles } from '../style/commonStyles'
import head from '../util/head'
import isAbsolute from '../util/isAbsolute'
import storage from '../util/storage'
import Editable from './Editable'
import NewThoughtInstructions from './NewThoughtInstructions'
import Search from './Search'
import Subthoughts from './Subthoughts'

const tutorialLocal = storage.getItem('Settings/Tutorial') === 'On'
const tutorialStepLocal = +(storage.getItem('Settings/Tutorial Step') || 1)

const transientChildPath = ['TRANSIENT_THOUGHT_ID'] as SimplePath

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

  const rankedRoot = isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH
  const children = getAllChildrenAsThoughts(state, head(rankedRoot))
  const rootThoughtsLength = children.filter(childrenFilterPredicate(state, rankedRoot)).length

  return {
    search,
    showModal,
    isTutorialLocal,
    tutorialStep,
    rootThoughtsLength,
    noteFocus,
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
  const { search, isTutorialLocal, rootThoughtsLength, isAbsoluteContext, scrollEnabled } = props

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
            <Subthoughts simplePath={isAbsoluteContext ? ABSOLUTE_PATH : HOME_PATH} expandable={true} />
          )}
        </>
      )}
    </ScrollView>
  )
}

export default connect(mapStateToProps)(Content)
