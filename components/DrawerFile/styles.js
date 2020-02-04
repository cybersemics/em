import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  sideMenu: {
    backgroundColor: '#292a2b',
    flex: 1,
    paddingTop: height * 0.04
  },
  listItemIcon: {
    marginRight: width * 0.03,
    marginLeft: width * 0.03,
    marginTop: height * 0.007
  },
  recentThought: {
    color: "white",
    fontSize: 18,
    alignSelf: 'center'
  },
  recentThoughtsWrapper: {
    paddingLeft: width * 0.05,
    paddingTop: height * 0.02
  },
  recentThoughtText: {
    color: "white",
    fontSize: 17,
    marginRight:width*0.01
  },
  count:{
    fontSize:10,
    color:'white',    
  }
});
