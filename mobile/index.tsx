import { registerRootComponent } from 'expo'
import { App } from '../src/components/App'
import { initialize } from '../src/initialize'
import '../src/util/shims'

initialize()

registerRootComponent(App)
