import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
    alignItems: 'center',
    paddingTop: height * 0.08
  },
  welcomeText: {
    color: 'white',
    fontSize: 30,
    fontFamily: 'Roboto_bold',
  },
  emDescriptionWrapper: {
    paddingLeft: width * 0.08,
    paddingRight: width * 0.08
  },
  startButton: {
    backgroundColor: 'white',
    width: width * 0.55,
    marginTop: height * 0.06,
    justifyContent: 'center',
    borderRadius: 50
  },
  emDescription: {
    color: 'white',
    marginTop: height * 0.02,
    fontSize: 19,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emText: {
    color: 'white',
    marginTop: height * 0.03,
    fontSize: 22,
    fontFamily: 'Roboto_medium',
    textAlign: 'center'
  },
  startText: {
    color: 'black',
    fontSize: 19,
    fontFamily: 'Roboto_regular',
  },
  skipText: {
    color: 'white',
    fontSize: 18,
    marginTop: height * 0.02,
    textDecorationLine: 'underline'
  },
});
