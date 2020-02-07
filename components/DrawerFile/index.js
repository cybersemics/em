import React from 'react'
import { View, Text, StatusBar } from 'react-native';
import { Octicons } from '@expo/vector-icons'
import styles from './styles'

const showDrawerList = ({ ...props }) => {
  return (
    <View style={styles.sideMenu}>
      <StatusBar hidden={true} />
      <Text style={styles.recentThought} >Recently Edited Thoughts</Text>
      <View style={styles.recentThoughtsWrapper}>
      </View>
    </View>)
}
export default showDrawerList