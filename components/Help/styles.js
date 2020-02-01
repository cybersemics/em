import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    height: height,
    backgroundColor: 'black'
  },
  tutorialTitle: {
    color: 'white',
    fontSize: 20,
    marginLeft: width * 0.1,
    marginTop: height * 0.1
  },
  helpText: {
    color: 'white',
    fontSize: 30,
    alignSelf: 'center'
  },
  body: {
    height: 0.1,
    backgroundColor: 'white',
    marginHorizontal: width * 0.1,
    marginTop: height * 0.005
  }
});
export default styles