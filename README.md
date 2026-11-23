
```markdown
<p align="center">
  <img src="https://img.shields.io/badge/Vue.js-3.x-green?style=flat-square&logo=vuedotjs" alt="Vue.js">
  <img src="https://img.shields.io/badge/Vite-Frontend-purple?style=flat-square&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/State-Pinia-yellow?style=flat-square" alt="Pinia">
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License">
</p>

# Heart Made Zone - Frontend UI (Vue 3)
**واجهة المستخدم وتطبيق الـ Single Page Application (SPA) لمنصة Heart Made Zone مبنية بـ Vue.js و Vite.**

## 📌 Project Overview & Idea / فكرة المشروع
The frontend is a modern, responsive Single Page Application (SPA) developed with **Vue 3**, **Pinia** for state management, **Vue Router**, and styled with Tailwind CSS / Bootstrap. It interfaces seamlessly with the Laravel REST API to provide a smooth shopping experience, user account management, cart operations, and an interactive admin panel.

---

## 🛠️ Tech Stack & Architecture / التقنيات المستخدمة
- **Framework:** Vue.js 3 (Composition API)
- **Build Tool:** Vite
- **State Management:** Pinia
- **Routing:** Vue Router
- **HTTP Client:** Axios (API communication)
- **Styling:** Tailwind CSS / CSS3

---

## 📂 Project Structure / هيكلية المجلدات الأساسية
```text
src/
├── assets/         # Styles, images, and static assets
├── components/     # Reusable UI components (Navbar, Footer, ProductCard, etc.)
├── router/         # Vue Router definitions & navigation guards
├── stores/         # Pinia state stores (auth, cart, products)
├── views/          # Page components (Home, Shop, ProductDetails, Cart, AdminDashboard)
├── App.vue         # Root component
└── main.js         # Application entry point

✨ Key Features / المميزات الرئيسية

    Responsive, modern UI/UX design optimized for all devices.

    Dynamic product browsing, filtering by categories, and search capabilities.

    Real-time shopping cart management and secure checkout process.

    User authentication views (Login/Register) with token-based session persistence.

    Protected routes for user profiles and administrator dashboards.

⚙️ Installation & Local Setup / خطوات التثبيت والتشغيل

    Clone the repository:
    Bash

    git clone [https://github.com/yousefdallol20/heartmade-vue.git](https://github.com/yousefdallol20/heartmade-vue.git)
    cd heartmade-vue

    Install dependencies:
    Bash

    npm install

    Configure Environment:
    Create a .env file in the root directory:
    مقتطف الرمز

    VITE_API_BASE_URL=[http://127.0.0.1:8000/api](http://127.0.0.1:8000/api)

    Run development server:
    Bash

👨‍💻 Author & License

    Developer: Yousef Dalloul (بشمهندس يوسف) - @yousefdallol20

    License: MIT License