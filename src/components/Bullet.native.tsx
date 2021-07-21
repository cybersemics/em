import React from 'react'
import { connect } from 'react-redux'

import { getLexeme, hasChildren, isContextViewActive, isPending } from '../selectors'
import { head } from '../util'
import { Context, State } from '../@types'
import { TouchableOpacity, Text, StyleSheet } from 'react-native'
import { commonStyles } from '../style/commonStyles'

// other bullets
// •◦◂◄◀︎ ➤▹▸►◥

interface BulletProps {
  glyph?: string | null
  isEditing?: boolean
  leaf?: boolean
  onClick: (event: any) => void
  showContexts?: boolean
  context: Context
}

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State, props: BulletProps) => {
  const { invalidState } = state
  const lexeme = getLexeme(state, head(props.context))
  return {
    // if being edited and meta validation error has occured
    invalid: !lexeme || (!!props.isEditing && invalidState),
    // re-render when leaf status changes
    isLeaf: !hasChildren(state, props.context),
    pending: isPending(state, props.context),
    showContexts: isContextViewActive(state, props.context),
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
}: BulletProps & ReturnType<typeof mapStateToProps>) => (
  <TouchableOpacity style={styles.container} onPress={onClick}>
    <Text style={[commonStyles.whiteText, styles.text]}>
      {glyph || (showContexts ? (isLeaf ? '◦' : '▹') : isLeaf ? '•' : '▸')}
    </Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'grey',
    borderRadius: 10,
    height: 20,
    width: 20,
    alignItems: 'center',
  },
  text: { fontSize: 30, marginTop: -10 },
})

export default connect(mapStateToProps)(Bullet)
