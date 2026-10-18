import { createApp } from "vue";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./assets/style.css";
import "./assets/utilities.css";
import App from "./App.vue";
import router from "./router.js";
createApp(App).use(router).mount("#app");
