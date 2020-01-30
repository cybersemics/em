import React from 'react'
import { View, Text, StatusBar, Dimensions } from 'react-native';
import { DrawerList } from '../ThoughtList'
import { Octicons } from '@expo/vector-icons'
let tempList = []
import styles from './styles'

export default showDrawerList = () => {
	tempList = DrawerList()
	console.log(tempList)
	return (
		<View style={styles.sideMenu}>
			<StatusBar hidden={true} />
			<Text style={styles.recentThought} >Recently Edited Thoughts</Text>
			<View style={styles.recentThoughtsWrapper}>
				{showList(tempList)}
			</View>
		</View>)
}

export const showList = (tempList) => {
	return (
		<View>
			{tempList.map((item, index) => {
				return (
					<View style={{ flexDirection: 'row' }}>
						<Octicons name='primitive-dot' size={15} color='white'
							style={styles.listItemIcon} style={styles.listItemIcon}
						/>
						<Text style={styles.recentThoughtText} key={index}>{item}</Text>
					</View>)
			})}
		</View>
	)
}