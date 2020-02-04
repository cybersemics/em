import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
  },
  carouselWrapper: {
    backgroundColor: '#1B1B1A',
    justifyContent: "flex-start",
    alignItems: 'stretch'
  },
  sliderButtonWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: height * 0.03
  },
  sliderButton: {
    backgroundColor: 'white',
    width: width * 0.25,
    justifyContent: 'center',
    borderRadius: 40,
    height: height * 0.048,
    marginLeft: width * 0.04,
    marginRight: width * 0.04
  },
  hintButton: {
    backgroundColor: 'white',
    width: width * 0.15,
    justifyContent: 'center',
    borderRadius: 40,
    height: height * 0.038,
    marginLeft: width * 0.005,
    marginTop: height * 0.01,
    opacity: 0.6
  },
  sliderButtonDisablePrev: {
    backgroundColor: 'white',
    width: width * 0.25,
    justifyContent: 'center',
    borderRadius: 40,
    height: height * 0.048,
    marginLeft: width * 0.04,
    marginRight: width * 0.04,
    opacity: 0.6
  },
  sliderButtonText: {
    fontSize: 18,
  },
  buttonLearnMore: {
    backgroundColor: 'white',
    width: width * 0.3,
    justifyContent: 'center',
    borderRadius: 40,
    height: height * 0.05,
    marginLeft: width * 0.04,
    marginRight: width * 0.04
  },
  buttonPlayOnMyOwn: {
    backgroundColor: 'white',
    width: width * 0.35,
    justifyContent: 'center',
    borderRadius: 40,
    height: height * 0.05,
    marginLeft: width * 0.04,
    marginRight: width * 0.04
  },
  sliderTextWrapper: {
    marginRight: width * 0.03,
    marginLeft: width * 0.03,
    paddingBottom:height*0.01 
  },
  instructionText: {
    color: 'white',
    marginTop: height * 0.01,
    fontStyle: 'italic'
  },
  infoText: {
    color: 'white',
    fontSize: 18,
    marginTop: height * 0.025
  },
  dotIconWrapper: {
    marginBottom: height * 0.01,
    marginRight: width * 0.03,
    marginLeft: width * 0.03
  },
  addIconWrapper: {
    marginBottom: height * 0.01,
    marginRight: width * 0.015,
    marginLeft: width * 0.015
  },
  thoughtListWrapper: {
    marginLeft: width * 0.05, backgroundColor: 'black'
  },
  listItemIcon: {
    marginTop: height * 0.01
  },
  thoughtText: {
    color: 'white',
    fontSize: 18,
    padding: 0,
  },
  thoughtsBody: {
    alignSelf: 'flex-start',
    marginTop: height * 0.02
  },
  welcomeTextWrapper: {
    alignContent: 'center',
    width: width,
    marginTop: height * 0.07
  },
  welcomeText: {
    color: '#858383',
    fontFamily: 'Roboto_medium-italic',
    fontSize: 19,
    textAlign: 'center'
  },
  paginationContainer: {
    paddingVertical: 0,
    marginBottom: height * 0.04
  },
  paginationDotContainer: {
    marginHorizontal: 3,
    marginVertical: 5
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  paginationDotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.92)'
  },
  count: {
    color: 'white',
    marginLeft: 5
  }
});
