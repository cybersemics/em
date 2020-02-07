import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native'
import { Container, Header, Content, Left } from 'native-base';
import styles from './styles'
import { Dot, Add, Hide, Show, Menu } from '../StyledIcon'
import { addNewThought} from '../../actions/ThoughtAction'
import { connect } from 'react-redux'

export default connect(({thoughtsList})=>({thoughtsList}), ({addNewThought}))(({...props})=>{
  const [thought, setThought] = useState('');
  const [focusedThought, setFocusedThought] = useState('');
  const [deleteItem, setDeleteItem] = useState(false);
  let tempList = []
  let tempDrawerList = []

  /// <summary>
  /// TODO : To add a thought..
  /// </summary>
  /// <param name="myThoughtList">thoughtList in which thought  is to be added</param>
  /// <param name="index">index where thought is to be added</param>  
  const addThought = (myThoughtList, index) => {
    console.log(props)
    tempList = []
    const obj = {
      thought: thought,
      count: 1,
    }
    if (focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
      myThoughtList[index] = obj
    }
    if (index == myThoughtList.length - 1) {
      myThoughtList.push({})
    }
    
      setInitialList(props.thoughtsList)
    
    const occurrences = tempList.filter((val) => {
      return val === thought;
    }).length;
    if (occurrences > 1) {
      setUpdatedCount(props.thoughtsList, thought, occurrences)
    }
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
          const newList = [...props.thoughtsList]
          props.addNewThought(newList)
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
    const newList = [...props.thoughtsList]
    props.addNewThought(newList)

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

  /// <summary>
  /// TODO : To delete a thought from thoughtList..
  /// </summary>
  /// <param name="event">thought which is selected</param>
  /// <param name="myThoughtList">list from which thought is to be deleted</param>	
  /// <param name="index">index of thought to be deleted</param>	  
  const deleteThought = (event, myThoughtList, index) => {
    if (event.nativeEvent.key == 'Backspace' && thought == '') {
      if (deleteItem) {
        if (myThoughtList.length > 1 && !(myThoughtList[index].hasOwnProperty('subList'))) {
          myThoughtList.splice(index, 1);
          const idx = tempDrawerList.indexOf(myThoughtList[index]);
          if (idx != -1) {
            tempDrawerList.splice(idx, 1);
            props.addNewThought(props.thoughtsList)
          }
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
  const subthoughtHideShow = (myThoughtList, index) => {
    myThoughtList[index].isOpen = !(myThoughtList[index].isOpen)
    const newList = [...props.thoughtsList]
    props.addNewThought(newList)
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
              item.hasOwnProperty("subList") ? subthoughtHideShow(data, index) : addSubThought(data, index)
            }} >
              {item.hasOwnProperty("subList") ?
                item.isOpen ? <Show /> : <Hide /> : <Dot />}
            </TouchableOpacity>}
            {!(item.hasOwnProperty("thought")) && <TouchableOpacity style={styles.addIconWrapper} >
              <Add />
            </TouchableOpacity>}
            <TextInput style={styles.thoughtText} value={item.thought}
              placeholder={item.hasOwnProperty('thought') && item.thought != '' ? '' : 'Add a thought'}
              onChangeText={(thought) => { editThought(data, thought, index) }}
              onKeyPress={(event) => { deleteThought(event, data, index) }}
              onFocus={() => { setFocusedThought(item.thought) }}
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
      <Header style={{ backgroundColor: 'black' }} androidStatusBarColor='black'>
        <Left style={{ flex: 1 }}>
          <TouchableOpacity >
            <Menu />
          </TouchableOpacity>
        </Left>
      </Header>
      <Content>
        <View style={styles.container}>
          {props.thoughtsList != undefined ? ThoughtList(props.thoughtsList) : ThoughtList([{}])}
        </View>
      </Content>
    </Container>
  );
});