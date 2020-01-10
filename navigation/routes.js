import {createAppContainer} from 'react-navigation';
import {createStackNavigator} from 'react-navigation-stack';
import Home from '../components/Home'
import ThoughtList from '../components/ThoughtList'

const MainNavigator = createStackNavigator({
  Home: {screen: Home},
  ThoughtList:{screen:ThoughtList}
},{
    initialRouteName: 'ThoughtList',
    headerMode: "none"
});

const Routes = createAppContainer(MainNavigator);

export default Routes;