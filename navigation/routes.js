import { createAppContainer } from 'react-navigation';
import DrawerNavigatorScreen from '../components/DrawerFile';
import { createDrawerNavigator } from 'react-navigation-drawer';
import { Dimensions } from 'react-native'
import ThoughtList from '../components/ThoughtList'
import WelcomeScreen from '../components/WelcomeScreen'
const { width, height } = Dimensions.get('window');

const MainNavigator = createDrawerNavigator({
  ThoughtList: { screen: ThoughtList },
  WelcomeScreen: { screen: WelcomeScreen },
},
  navigationOptions = {
    initialRouteName: 'WelcomeScreen',
    headerMode: 'none',
    contentComponent: DrawerNavigatorScreen,
    drawerWidth: width * 0.55
  })

const Routes = createAppContainer(MainNavigator);
export default Routes;