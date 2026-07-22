import { createApp } from 'vue';
import 'foundry/css'; // tokens + components in one file
import 'foundry';     // side-effect: registers every window.Foundry* enhancer
import App from './App.vue';

createApp(App).mount('#app');
