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
        {props.recentlyEditedList!=undefined&&props.recentlyEditedList.map((item, index) => {
          return (
            item.thought != '' && <View style={{ flexDirection: 'row' }}>
              <Octicons name='primitive-dot' size={15} color='white'
                style={styles.listItemIcon} style={styles.listItemIcon}
              />
              <Text style={styles.recentThoughtText} key={index}>{item.thought}</Text>
              {item.hasOwnProperty("count") && item.count != 1 && <Text style={styles.count}>{item.count}</Text>}
            </View>)
        })}
      </View>
    </View>)
}
export default showDrawerList
