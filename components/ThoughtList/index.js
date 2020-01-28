import React, { Component, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import { Button, Container, Header, Content } from 'native-base';
import styles from './styles'
const { width, height } = Dimensions.get('window');

function Thoughts({ ...props }) {
	// Declare a new state variable, which we'll call "count"
	const [count, setCount] = useState(0);
	const [thoughtList, setThoughtList] = useState([{}]);
	const [thought, setThought] = useState('');
	const [focusedThought, setFocusedThought] = useState('');
	const [deleteItem, setDeleteItem] = useState(false);
	let tempList = []
	const addThought = (myThoughtList, index) => {
		tempList = []
		const obj = {
			thought: thought,
			count: 1
		}
		if (focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
			myThoughtList[index] = obj
		}
		if (index == myThoughtList.length - 1) {
			myThoughtList.push({})
		}

		setInitialList(thoughtList)
		const occurrences = tempList.filter((val) => {
			return val === thought;
		}).length;
		if (occurrences > 1) {
			setUpdatedCount(thoughtList, thought, occurrences)
		}
		setCount(count + 1)
	}

	/// <summary>
	/// TODO : To convert the nested thought list to single list..
	/// </summary>
	/// <param name="myList">thought list or subthought list</param>
	const setInitialList = (myList) => {
		myList.forEach((item) => {
			if (item.hasOwnProperty('thought')) {
				tempList.push(item.thought)
			}
			if (item.hasOwnProperty('subList')) {
				setInitialList(item.subList)
			}
		})
	}

	/// <summary>
	/// TODO : Update the list with count of each thought..
	/// </summary>
	/// <param name="myList">thought list or subthought list</param>
	/// <param name="thought">thought to be added</param>
	/// <param name="occurrences">total ocurrences of the thought in thoughtList</param>
	const setUpdatedCount = (myList, thought, occurrences) => {
		myList.forEach((item) => {
			if (item.hasOwnProperty('thought')) {
				if (item.thought == thought) {
					item.count = occurrences
					setCount(count + 1)
				}
			}
			if (item.hasOwnProperty('subList')) {
				setUpdatedCount(item.subList, thought, occurrences)
			}
		})
	}

	/// <summary>
	/// TODO : To create a subThought list in a Thought..
	/// </summary>
	/// <param name="myThoughtList">thought list in which data is to be added</param>
	/// <param name="index">To insert thought at particular postion</param>
	const addSubThought = (myThoughtList, index) => {
		const obj = {}
		if (myThoughtList[index].hasOwnProperty("subList")) {
			myThoughtList[index].subList.push(obj)
		}
		else {
			myThoughtList[index].subList = [obj]
			myThoughtList[index].isOpen = true
		}
		setCount(count + 1)
	}

	/// <summary>
	/// TODO : To Edit Thought..
	/// </summary>
	/// <param name="myThoughtList">thought list in which data is to be added</param>
	/// <param name="myThought">thought to be added</param>
	/// <param name="index">To insert thought at particular postion</param>
	const editThought = (myThoughtList, myThought, index) => {
		const initialThought = myThoughtList[index].thought
		myThoughtList[index].thought = myThought
		if (myThoughtList[index].count > 1) {
			const count = myThoughtList[index].count - 1
			myThoughtList[index].count = 1
			setUpdatedCount(myThoughtList, initialThought, count)
		}
		setThought(myThought)
	}



	const selectThought = (thought) => {
		setFocusedThought(thought)
	}

	const deleteThought = (event, myThoughtList, index) => {
		if (event.nativeEvent.key == 'Backspace' && thought == '') {
			if (deleteItem) {
				if (myThoughtList.length > 1 && !(myThoughtList[index].hasOwnProperty('subList'))) {
					myThoughtList.splice(index, 1);
				}
			}
			setDeleteItem(!deleteItem)
		}
	}

	/// <summary>
	/// TODO : To hide or show the subthought list ..
	/// </summary>
	/// <param name="myThoughtList">thought list in which data is to be added</param>
	/// <param name="index">To insert thought at particular postion</param>
	const handleHideShow = (myThoughtList, index) => {
		myThoughtList[index].isOpen = !(myThoughtList[index].isOpen)
		setCount(count + 1)
	}

	/// <summary>
	/// TODO : To display all thoughts and subthoughts..
	/// </summary>
	/// <param name="data">list of all thoughts</param>
	const ThoughtList = (data) => {
		return (
			<View style={styles.thoughtListWrapper}>
				{data.length > 0 && data.map((item, index) => {
					return (<View key={index}><View style={{ flexDirection: 'row' }} >
						{item.hasOwnProperty("thought") && <TouchableOpacity style={styles.dotIconWrapper} onPress={() => {
							item.hasOwnProperty("subList") ? handleHideShow(data, index) : addSubThought(data, index)
						}} >
							{item.hasOwnProperty("subList") ?
								<Ionicons
									name={item.isOpen ? 'md-arrow-dropdown' : 'md-arrow-dropright'}
									size={20}
									style={styles.listItemIcon}
									color='white'
								/> : <Octicons
									name='primitive-dot'
									size={20}
									style={styles.listItemIcon}
									color='white'
								/>}
						</TouchableOpacity>
						}
						{!(item.hasOwnProperty("thought")) && <TouchableOpacity style={styles.addIconWrapper} onPress={() => { }} >
							<MaterialIcons
								name='add'
								size={20}
								style={styles.listItemIcon}
								color='white'
							/>
						</TouchableOpacity>
						}
						<TextInput style={styles.thoughtText} value={item.thought}
							placeholder={item.hasOwnProperty('thought') && item.thought != '' ? '' : 'Add a thought'}
							onChangeText={(thought) => { editThought(data, thought, index) }}
							onKeyPress={(event) => { deleteThought(event, data, index) }}
							onFocus={() => { selectThought(item.thought) }}
							onBlur={() => { setFocusedThought('') }}
							onSubmitEditing={() => { addThought(data, index) }}>
						</TextInput>
						{item.hasOwnProperty("count") && item.count != 1 && <Text style={styles.count}>{item.count}</Text>}
					</View>
						{item.hasOwnProperty("subList") && item.isOpen && ThoughtList(item.subList)}
					</View>)
				})}
			</View>
		);
	}

	return (
		<Container>
			<Header style={{ height: 0 }} androidStatusBarColor='black'></Header>
			<Content>
				<View style={styles.container}>
					{ThoughtList(thoughtList)}
				</View>
			</Content>
		</Container>
	);
}

export default Thoughts


