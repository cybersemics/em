import React from 'react';
import { View, Text } from 'react-native'
import { Container, Header, Content } from 'native-base';
import styles from './styles'

const { width, height } = Dimensions.get('window');

function Help({ ...props }) {
  return (
    <Container>
      <Header style={{ height: 0 }} androidStatusBarColor='black' />
      <Content>
        <View style={styles.container}>
          <View><Text style={styles.helpText}>Help</Text></View>
          <View>
            <Text style={styles.tutorialTitle}>Tutorials</Text>
            <View style={styles.body}></View>
          </View>
        </View>
      </Content>
    </Container>
  );
}
export default Help


