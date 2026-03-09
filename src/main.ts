import './assets/global.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);

// 自动调整高度指令
app.directive('autosize', {
  mounted(el) {
    if (el.tagName === 'TEXTAREA') {
      el.style.overflow = 'hidden';
      const adjust = () => {
        el.style.height = 'auto';
        el.style.height = el.scrollHeight + 'px';
      };
      el.addEventListener('input', adjust);
      // 初始调整，延迟一下确保内容已渲染
      setTimeout(adjust, 0);
    }
  },
  updated(el) {
    if (el.tagName === 'TEXTAREA') {
      el.style.overflow = 'hidden';
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    }
  },
});

app.use(router);

app.mount('#app');
