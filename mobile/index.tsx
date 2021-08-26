import { registerRootComponent } from 'expo'
import { App } from '../src/components/App'
import '../src/util/shims'
import { initialize } from '../src/initialize'

initialize()

registerRootComponent(App)
