import { createAppContainer } from 'react-navigation';
import { createStackNavigator } from 'react-navigation-stack';
import ThoughtList from '../components/ThoughtList'
import WelcomeScreen from '../components/WelcomeScreen'

const MainNavigator = createStackNavigator({
  ThoughtList: { screen: ThoughtList },
  WelcomeScreen: { screen: WelcomeScreen },
},
  {
    initialRouteName: 'WelcomeScreen',
    headerMode: "none"
  });

const Routes = createAppContainer(MainNavigator);

export default Routes;