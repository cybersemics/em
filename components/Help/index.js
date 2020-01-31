import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Dimensions } from 'react-native'
import { MaterialIcons, Octicons, Ionicons } from '@expo/vector-icons'
import Carousel, { Pagination } from 'react-native-snap-carousel'; // 3.6.0
import { Button, Container, Header, Content } from 'native-base';
import styles from './styles'

const { width, height } = Dimensions.get('window');

function Help({ ...props }) {
  return (
    <Container>
      <Header style={{ height: 0 }} androidStatusBarColor='black'/>
      <Content>
        <View style={{height:height,backgroundColor:'black'}}>
          <View><Text style={{color:'white',fontSize:30,alignSelf:'center'}}>Help</Text></View>
          <View>
          <Text style={{color:'white',fontSize:20,marginLeft:width*0.1,marginTop:height*0.1}}>Tutorials</Text>
          <View style={{height:0.1,backgroundColor:'white',marginHorizontal:width*0.1,marginTop:height*0.005}}></View>
        </View>
        </View>        
      </Content>
    </Container>
  );
}
export default Help


