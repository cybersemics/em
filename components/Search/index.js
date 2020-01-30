import React from 'react'
import { View } from 'react-native'
import { showList } from '../DrawerFile'
import { Button, Text } from 'native-base'
import styles from './styles'
let filteredList = []

export function setSearchList(filtered) {
  filteredList = filtered
  console.log(filteredList)
}

export function SearchThought(searchText, count) {
  return (
    <View style={{ alignSelf: 'center' }}>
      <Button style={styles.searchButton} onPress={() => { }}>
        <Text uppercase={false} style={styles.searchButtonText}>{`Create ${searchText}`}</Text>
      </Button>
      {searchText != "" && showList(filteredList)}
      <Text style={styles.count}>{`${filteredList.length} match for ${searchText}`}</Text>
      <Text style={styles.escape}>Type Escape to close the search</Text>
    </View>
  )
}