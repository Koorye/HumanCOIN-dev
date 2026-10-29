import { createApp } from 'vue'
import App from './App.vue'
import { vReveal } from './composables/useReveal'
import './styles/tokens.css'
import './styles/base.css'

createApp(App).directive('reveal', vReveal).mount('#app')
