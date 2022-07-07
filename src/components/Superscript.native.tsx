import React, { FC } from 'react'
import { StyleSheet } from 'react-native'
import { connect } from 'react-redux'
import Context from '../@types/Context'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import getAncestorByValue from '../selectors/getAncestorByValue'
import getContexts from '../selectors/getContexts'
import hasLexeme from '../selectors/hasLexeme'
import rootedParentOf from '../selectors/rootedParentOf'
import { commonStyles } from '../style/commonStyles'
import equalArrays from '../util/equalArrays'
import head from '../util/head'
import headValue from '../util/headValue'
import parentOf from '../util/parentOf'
import pathToContext from '../util/pathToContext'
import { Text } from './Text.native'

interface SuperscriptProps {
  contextViews?: Index<boolean>
  empty?: boolean
  numContexts?: number
  showContexts?: boolean
  showModal?: string | null
  showSingle?: boolean
  superscript?: boolean
  thoughts?: Context
  simplePath: SimplePath
  simplePathLive?: SimplePath
  thoughtRaw?: ThoughtId
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: SuperscriptProps) => {
  const { contextViews, cursor, showHiddenThoughts, showModal } = state
  const cursorContext = cursor ? pathToContext(state, cursor) : [HOME_TOKEN]

  const editing =
    cursor &&
    equalArrays(cursorContext, pathToContext(state, props.simplePath || [])) &&
    hasLexeme(state, headValue(state, cursor))

  const simplePath = props.showContexts && props.simplePath ? rootedParentOf(state, props.simplePath) : props.simplePath

  const thoughts = props.thoughts || pathToContext(state, simplePath)

  const thoughtsLive = editing ? (props.showContexts ? parentOf(cursorContext) : cursorContext) : thoughts

  const simplePathLive = editing ? (parentOf(props.simplePath).concat(head(cursor!)) as SimplePath) : simplePath

  /** Gets the number of contexts of the thoughtsLive signifier. */
  const numContexts = () => {
    const contexts = getContexts(state, head(thoughtsLive))
    // thoughtContext.context should never be undefined, but unfortunately I have personal thoughts in production with no context. I am not sure whether this was old data, or if it's still possible to encounter, so guard against undefined context for now.
    return (
      showHiddenThoughts
        ? contexts
        : contexts.filter(thoughtContext => !getAncestorByValue(state, thoughtContext, '=archive'))
    ).length
  }

  return {
    contextViews,
    thoughts,
    simplePathLive,
    simplePath,
    // thoughtRaw is the head that is removed when showContexts is true
    thoughtRaw: props.showContexts ? head(props.simplePath) : head(simplePathLive),
    empty: thoughtsLive.length > 0 ? head(thoughtsLive).length === 0 : true, // ensure re-render when thought becomes empty
    numContexts: hasLexeme(state, head(thoughtsLive)) ? numContexts() : 0,
    showModal,
  }
}

/** Renders superscript if there are other contexts. Optionally pass thoughts (used by ContextBreadcrumbs) or simplePath (used by Subthought). */
const Superscript: FC<SuperscriptProps> = ({ empty, numContexts, showSingle, superscript = true }) => {
  return (
    <Text>
      {!empty && superscript && numContexts! > (showSingle ? 0 : 1) ? (
        <Text>{numContexts ? <Text style={[commonStyles.halfOpacity, styles.sup]}>{numContexts}</Text> : null}</Text>
      ) : null}
    </Text>
  )
}

const styles = StyleSheet.create({
  sup: { fontSize: 2 },
})

export default connect(mapStateToProps)(Superscript)
