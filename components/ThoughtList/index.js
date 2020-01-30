import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { Container, Header, Content, Left, Right } from 'native-base';
import styles from './styles'
import { Dot, Add, Hide, Show, Menu, Delete, MenuFold, MenuUnFold, Search, Undo, Redo } from '../StyledIcon'
import { SearchThought,setSearchList } from '../Search'

let tempDrawerList = []
let filteredList = []
function Thoughts({ ...props }) {
	const [count, setCount] = useState(0);
	const [thoughtList, setThoughtList] = useState([{}]);
	const [thought, setThought] = useState('');
	const [focusedThought, setFocusedThought] = useState('');
	const [deleteItem, setDeleteItem] = useState(false);
	const [searchState, setSearch] = useState(false);
	const [searchText, setSearchText] = useState('');
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

		const occurrence = tempDrawerList.filter((val) => {
			return val === thought;
		}).length;
		if (!(occurrence > 1)) {
			tempDrawerList.splice(0, 0, thought);
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
					const idx = tempDrawerList.indexOf(myThoughtList[index]);
					if (idx != -1) { tempDrawerList.splice(idx, 1); }
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
								item.isOpen ? <Show /> : <Hide /> : <Dot />}
						</TouchableOpacity>
						}
						{!(item.hasOwnProperty("thought")) && <TouchableOpacity style={styles.addIconWrapper} >
							<Add />
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

		/// <summary>
	/// TODO : To search for a thought..
	/// </summary>
	/// <param name="keyword">keyword for search</param>
	const searchForThought = (keyword) => {
		filteredList = []
		if (tempList.length < 1) {
			setInitialList(thoughtList)
		}
		if (keyword != '') {
			tempList.filter((value) => {
				if (val.toLowerCase().match(keyword.toLowerCase())) {
					filteredList.push(val)
				}
			})			
		}
		else{
			filteredList = []
		}
		setSearchList(filteredList)
		setSearchText(keyword)
	}

	return (
		<Container>
			<Header style={{ backgroundColor: 'black' }} androidStatusBarColor='black'>
				<Left style={{ flex: 1 }}>
					<TouchableOpacity onPress={() => { props.navigation.openDrawer() }}>
						<Menu />
					</TouchableOpacity>
				</Left>
				<Right style={{ flex: 1 }}>
					<View style={{ flexDirection: 'row' }}>
						<TouchableOpacity onPress={() => { setSearch(!searchState) }}>
							<Search />
						</TouchableOpacity>						
					</View>
				</Right>
			</Header>
			<Content>
				<View style={styles.container}>
					{searchState ? <View>
						<View style={styles.searchWrapper}>
							<Search />
							<TextInput placeholder={`Search ${thoughtList.length - 1} thoughts`}
								style={styles.SearchField}
								onChangeText={(value) => { searchForThought(value) }}
							/>
						</View>
						{SearchThought(searchText, 0)}
					</View>
						: ThoughtList(thoughtList)}
				</View>
			</Content>
		</Container>
	);
}

export function setFilteredList() {
	return filteredList
}

export function DrawerList() {
	return tempDrawerList
}

export default Thoughts


