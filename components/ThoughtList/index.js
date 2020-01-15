import React, { Component } from 'react'
import { View, TouchableOpacity, TextInput, Dimensions} from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
const { width, height } = Dimensions.get('window');
import styles from './styles'

export default class ThoughtList extends Component {
    constructor(props) {
        super(props)
        this.state = {
            thoughtsList: [{}],
            thought: '',

        }
    }

    ThoughtList = (data) => {
        return (
            <View style={{ marginLeft: width * 0.05 }}>
                {data.map((item, index) => {
                    return (<View key={index}><View style={{ flexDirection: 'row' }} >
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

                        <TextInput style={styles.thoughtText} placeholder='Add a thought' value={item.thought}
                            onChangeText={(thought) => { this.editThought(data, thought, index) }}
                            ref={input => {
                                this[`thought${index}`] = input;
                            }} onSubmitEditing={() => { this.addThought(data, index) }}>
                        </TextInput>
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
            <View style={styles.container}>
                {this.ThoughtList(this.state.thoughtsList)}
            </View>
        );
    }

    /// <summary>
    /// TODO : To Add SubThought..
    /// </summary>
    /// <param name="myThoughtList">thought list in which data is to be added</param>
    /// <param name="index">To insert thought at particular postion</param>
    addThought = (myThoughtList, index) => {
        let obj = {}
        obj.thought = this.state.thought

        myThoughtList[index] = obj
        if (index == myThoughtList.length - 1) {
            myThoughtList.push({})
        }
        this.setState({
           
        }, () => {
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
        myThoughtList[index].thought = myThought
        this.setState({
            thought: myThought
        })
    }

}


