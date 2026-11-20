import { createApp } from 'vue'
import App from './App.vue'
import { vReveal } from './composables/useReveal'
import { initTheme } from './composables/useTheme'
import './styles/tokens.css'
import './styles/base.css'
import './styles/dark.css'

initTheme()

createApp(App).directive('reveal', vReveal).mount('#app')
