import { createApp } from 'vue';
import '@cahyo-dimas/freeday/css'; // tokens + components in one file
import '@cahyo-dimas/freeday';     // side-effect: registers every window.Freeday* enhancer
import App from './App.vue';

createApp(App).mount('#app');
