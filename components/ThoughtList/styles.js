import { Dimensions, StyleSheet } from 'react-native'
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'black',
        flex: 1,

        paddingTop: height * 0.08
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
});
export default styles