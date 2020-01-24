import React, { Component } from 'react'
import { View, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import { Container, Header, Text, Content } from 'native-base'
const { width, height } = Dimensions.get('window');
import styles from './styles'
let tempList = []
let deleteThought = false

export default class ThoughtList extends Component {
    constructor(props) {
        super(props)
        this.state = {
            thoughtsList: [{}],
            thought: '',
            focusedThought: ''
        }
    }

    ThoughtList = (data) => {
        return (
            <View style={styles.thoughtListWrapper}>
                {data.map((item, index) => {
                    return (<View key={index}  ><View style={{ flexDirection: 'row' }} >
                        {item.hasOwnProperty("thought") && <TouchableOpacity style={styles.dotIconWrapper} onPress={() => {
                            item.hasOwnProperty("subList") ? this.handleHideShow(data, index) : this.addSubThought(data, index)
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
                        </TouchableOpacity>}
                        {!(item.hasOwnProperty("thought")) && <TouchableOpacity style={styles.addIconWrapper} >
                            <MaterialIcons
                                name='add'
                                size={20}
                                style={styles.listItemIcon}
                                color='white'
                            />
                        </TouchableOpacity>}
                        <TextInput style={styles.thoughtText} value={item.thought}
                            placeholder={item.hasOwnProperty('thought') && item.thought != '' ? '' : 'Add a thought'}
                            onChangeText={(thought) => { this.editThought(data, thought, index) }}
                            onKeyPress={(event) => { this.deleteThought(event, data, index) }}
                            onFocus={() => { this.selectThought(item.thought) }}
                            onBlur={() => { this.setState({ focusedThought: '' }) }}
                            ref={input => {
                                this[`thought${index}`] = input;
                            }} onSubmitEditing={() => { this.addThought(data, index) }}>
                        </TextInput>
                        {item.hasOwnProperty("count") && item.count != 1 && <Text style={styles.count}>{item.count}</Text>}
                    </View>
                        {item.hasOwnProperty("subList") && item.isOpen && this.ThoughtList(item.subList)}
                    </View>
                    )
                })}
            </View>
        );
    }

    render() {
        return (
            <Container>
                <Header style={{ height: 0 }} androidStatusBarColor='black'></Header>
                <Content style={{ backgroundColor: 'black' }}>
                    <View style={styles.container}>
                        {this.ThoughtList(this.state.thoughtsList)}
                    </View>
                </Content>
            </Container>
        );
    }

    /// <summary>
    /// TODO : To Add SubThought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addThought = (myThoughtList, index) => {
        tempList = []
        let myThought = this.state.thought
        let obj = {}
        if (this.state.focusedThought != myThoughtList[index].thought && !(myThoughtList[index].hasOwnProperty("subList"))) {
            obj.thought = this.state.thought
            obj.count = 1
            myThoughtList[index] = obj
        }
        if (index == myThoughtList.length - 1) {
            myThoughtList.push({})
        }
        this.setInitialList(this.state.thoughtsList)

        var occurrences = tempList.filter((val) => {
            return val === myThought;
        }).length;

        if (occurrences > 1) {
            this.setUpdatedCount(this.state.thoughtsList, myThought, occurrences)
        }
        this.setState({}, () => {
            console.log(this.state.thoughtsList)
        })
    }

    /// <summary>
    /// TODO : To create a subThought list in a Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addSubThought = (myThoughtList, index) => {
        console.log('long presss')
        let obj = {}
        if (myThoughtList[index].hasOwnProperty("subList")) {
            myThoughtList[index].subList.push(obj)
        }
        else {
            myThoughtList[index].subList = [obj]
            myThoughtList[index].isOpen = true
        }
        this.setState({})
    }

    /// <summary>
    /// TODO : To hide or show the subthought list ..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    handleHideShow = (myThoughtList, index) => {
        myThoughtList[index].isOpen = !(myThoughtList[index].isOpen)
        this.setState({})
    }

    /// <summary>
    /// TODO : To Edit Thought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="myThought">thought to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    editThought = (myThoughtList, myThought, index) => {
        let initialThought = myThoughtList[index].thought
        myThoughtList[index].thought = myThought
        if (myThoughtList[index].count > 1) {
            let count = myThoughtList[index].count - 1
            this.setUpdatedCount(myThoughtList, initialThought, count)
        }
        this.setState({
            thought: myThought
        })
    }

    selectThought = (thought) => {
        this.setState({ focusedThought: thought })
        deleteThought = false
    }

    deleteThought = (event, myThoughtList, index) => {
        if (event.nativeEvent.key == 'Backspace' && this.state.thought == '') {
            if (deleteThought) {
                if (myThoughtList.length > 1 && !(myThoughtList[index].hasOwnProperty('subList'))) {
                    myThoughtList.splice(index, 1);
                    console.log('delete')
                    this.setState({})
                }
            }
            deleteThought = !deleteThought
        }
    }

    /// <summary>
    /// TODO : To convert the nested thought list to single list..
    /// </summary>
    /// <param name="myList">thought list or subthought list</param>
    setInitialList(myList) {
        myList.forEach((item) => {
            if (item.hasOwnProperty('thought')) {
                tempList.push(item.thought)
            }
            if (item.hasOwnProperty('subList')) {
                this.setInitialList(item.subList)
            }
        })
        console.log(tempList)
    }

    /// <summary>
    /// TODO : Update the list with count of each thought..
    /// </summary>
    /// <param name="myList">thought list or subthought list</param>
    /// <param name="thought">thought to be added</param>
    /// <param name="occurrences">total ocurrences of the thought in thoughtList</param>
    setUpdatedCount(myList, thought, occurrences) {
        myList.forEach((item) => {
            if (item.hasOwnProperty('thought')) {
                if (item.thought == thought) {
                    console.log('thought' + item.thought + item.count.toString())
                    item.count = occurrences
                    this.setState({})
                }
            }
            if (item.hasOwnProperty('subList')) {
                this.setUpdatedCount(item.subList, thought, occurrences)
            }
        })
        console.log(tempList)
    }

}


