import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Button, Text, Container, Header } from 'native-base'
import styles from './styles'

const WelcomeScreen = ({ ...props }) => {
  return (
    <Container>
      <Header style={{ height: 0 }} androidStatusBarColor='black'></Header>
      <View style={styles.container}>
        <Text style={styles.welcomeText}>Welcome to em</Text>
        <View style={styles.emDescriptionWrapper}>
          <Text style={styles.emText}>em
      <Text style={styles.emDescription}> is a tool that helps you organize and develop your thoughts</Text>
          </Text>
        </View>
        <Button style={styles.startButton} onPress={() => { props.navigation.navigate('TutorialHome') }}>
          <Text style={styles.startText}>Start Tutorial</Text>
        </Button>
        <TouchableOpacity onPress={() => { props.navigation.navigate('ThoughtList') }}>
          <Text style={styles.skipText} >Skip Tutorial</Text>
        </TouchableOpacity>
      </View>
    </Container>
  );
}
export default WelcomeScreen

