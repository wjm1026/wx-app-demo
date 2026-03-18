import { createSSRApp } from "vue";
import App from "./App.vue";
/** 创建应用 */
export function createApp() {
  const app = createSSRApp(App);
  return {
    app,
  };
}
