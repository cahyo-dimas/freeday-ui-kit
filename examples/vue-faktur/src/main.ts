import { createApp } from 'vue';
import 'freeday/css'; // tokens + components in one file
import 'freeday';     // side-effect: registers every window.Freeday* enhancer
import App from './App.vue';

createApp(App).mount('#app');
