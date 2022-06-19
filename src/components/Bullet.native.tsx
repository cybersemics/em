import State from '../@types/State'
import React from 'react'
import { connect } from 'react-redux'
import getLexeme from '../selectors/getLexeme'
import { hasChildren } from '../selectors/getChildren'
import isPending from '../selectors/isPending'
import { isContextViewActiveById } from '../selectors/isContextViewActive'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { commonStyles } from '../style/commonStyles'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: any) => void
  showContexts?: boolean
  thoughtId: ThoughtId
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const thought = getThoughtById(state, props.thoughtId)
  const lexeme = getLexeme(state, thought.value)
  return {
    // if being edited and meta validation error has occured
    invalid: !lexeme || (!!props.isEditing && invalidState),
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, thought.id),
    pending: isPending(state, thought),
    showContexts: isContextViewActiveById(state, thought.id),
  }
}

/** Connect bullet to contextViews so it can re-render independent from <Subthought>. */
const Bullet = ({
  showContexts,
  glyph,
  isLeaf,
  onClick,
  invalid,
  pending,
  isEditing,
}: BulletProps & ReturnType<typeof mapStateToProps>) => (
  <TouchableOpacity style={[styles.container, isEditing && styles.backgroundColor]} onPress={onClick}>
    <Text style={[commonStyles.whiteText, styles.text]}>
      {glyph || (showContexts ? (isLeaf ? '◦' : '▹') : isLeaf ? '•' : '▸')}
    </Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  backgroundColor: {
    backgroundColor: 'grey',
  },
  container: {
    borderRadius: 10,
    height: 20,
    width: 20,
    alignItems: 'center',
  },
  text: { fontSize: 30, marginTop: -10 },
})

export default connect(mapStateToProps)(Bullet)
