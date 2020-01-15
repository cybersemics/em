import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        flex: 1,
        alignItems: 'center',
        paddingTop: height * 0.02
    },
    carouselWrapper: {
        backgroundColor: '#1B1B1A',
        height: height * 0.4,
        justifyContent: 'space-between'
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
        height: height * 0.05,
        marginLeft: width * 0.04,
        marginRight: width * 0.04
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
        marginLeft: width * 0.03
    },
    instructionText: {
        color: 'white',
        marginTop: height * 0.01
    },
    infoText: {
        color: 'white',
        fontSize: 17,
        marginTop: height * 0.02
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
    listItemIcon: {
        marginTop: height * 0.01
    },
    thoughtText: {
        color: 'white',
        fontSize: 18
    },
    thoughtsBody: {
        alignSelf: 'flex-start',
        marginTop: height * 0.02
    },
    welcomeTextWrapper: {
        alignContent: 'center',
        width: width
    },
    welcomeText: {
        color: '#646161',
        fontFamily: 'Roboto_medium',
        fontSize: 18,
        textAlign: 'center'
    }
});
export default styles