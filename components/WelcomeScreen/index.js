import React, { Component } from 'react'
import { View, TouchableOpacity, Dimensions} from 'react-native'
import { Button,Text } from 'native-base'
const { width, height } = Dimensions.get('window');
import styles from './styles'

export default class ThoughtList extends Component {
    constructor(props) {
        super(props)
        this.state = {
        }
    }

    render() {
        return (
            <View style={styles.container}>
                <Text style={styles.welcomeText}>Welcome to em</Text>
                <View style={styles.emDescriptionWrapper}>
                <Text style={styles.emText}>em 
                <Text style={styles.emDescription}> is a tool that helps you organize and develop your thoughts</Text>
                </Text>
                </View>
               <Button style={styles.startButton} onPress={()=>{this.props.navigation.navigate('TutorialHome')}}>
                   <Text style={styles.startText}>Start Tutorial</Text>
               </Button>
               <TouchableOpacity onPress={()=>{this.props.navigation.navigate('ThoughtList')}}>
               <Text style={styles.skipText} >Skip Tutorial</Text>
               </TouchableOpacity>               
            </View>
        );
    }
}

