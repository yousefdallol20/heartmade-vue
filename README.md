# Heart Made — Vue Frontend

A complete Vue 3 frontend using Vite, Vue Router, Bootstrap, Bootstrap Icons, and Chart.js. The original design, content, colors, images, and fonts are retained. This is a frontend-only project. Admin sign-in and password recovery are local UI previews. There is no PHP, backend, API, shared database, real authentication, email sending, or payment processing.

For authentication setup, account creation, and Arabic instructions, read **SETUP_AR.md** first.

## Run locally

Use Node.js 22.12 or newer. Extract the archive, open a terminal, and run:

```sh
cd heartmade-vue
npm install
npm run dev
```

Open the URL printed in the terminal, usually `http://localhost:5173`.

To build and preview production files:

```sh
npm run build
npm run preview
```

The usual preview URL is `http://localhost:4173`. Use `npm ci` instead of `npm install` for an exact lockfile installation. The included `dist/` folder contains the built frontend. Serve it through a static web server; do not open `index.html` directly. Hash routing works on static hosting without route rewrite rules.

## Pages

| URL                 | Page                                                          |
| ------------------- | ------------------------------------------------------------- |
| `/#/`               | Home                                                          |
| `/#/catalog`        | Catalog, search, categories, sorting                          |
| `/#/product?id=fb1` | Product details, gallery, quantity                            |
| `/#/story`          | Our Story                                                     |
| `/#/corporate`      | Corporate gifting and inquiry form                            |
| `/#/checkout`       | Demo checkout                                                 |
| `/#/admin/login` | Admin sign-in |
| `/#/admin/forgot-password` | Password recovery |
| `/#/admin/reset-password` | Password reset preview |
| `/#/admin`          | Overview, creations, orders, reports, notifications, settings |

## Source structure

- `src/views/`: page components.
- `src/components/`: shared header, footer, product cards, and cart drawer.
- `src/stores/shop.js`: shared reactive state and browser storage.
- `src/data/catalog.js`: initial products, categories, and delivery cities.
- `src/composables/`: navigation and local image processing.
- `src/assets/`: local images, fonts, and styles.
- `src/router.js`: routing, document titles, and section scrolling.
- `licenses/`: bundled font licenses.

## Frontend behavior

Products, orders, inquiries, settings, partners, the cart, and notification read states are saved in `localStorage` on the current browser. Data is not shared between devices. Clearing browser storage removes local changes.

The cart badge counts distinct products rather than quantities. Cart quantities are limited by available stock. Out-of-stock and upcoming items cannot be added.

The creations table uses display row numbers such as `#1` and `#2`; internal product IDs remain unchanged. Display numbers follow the full product list and stay consistent while searching. Search matches row numbers, names, categories, and internal IDs. The compact search field and result count sit on opposite sides of the toolbar.

Home product cards display the short summary entered in the product editor. Initial products without a short summary use their description.

Manual orders support multiple products selected from the catalog, unit prices, quantities, optional delivery fees, and automatically calculated totals. Selecting a product fills its current unit price; the price can be edited. The pencil button opens the same form for editing. Delivered status is final and cannot be changed in the form or status selector. Other status selectors remain white. Existing delivery fees are preserved during editing.

Overview earnings and financial reports count Delivered orders only. Monthly earnings count Delivered orders created in the current month. Product revenue uses order item prices recorded at purchase time and excludes delivery fees; order totals include fees.

Every catalog product appears in the doughnut chart. Display weights are `1 + delivered units sold`, keeping unsold products visible with equal baseline slices. Prices do not affect slice size. Selecting a slice or legend item shows the product name, current price, remaining stock, delivered units sold, and product revenue without replaying the chart animation.

The monthly sales chart defaults to actual Delivered order data. The optional Demo sales switch displays clearly labeled illustrative company-scale figures. Demo figures do not alter orders or financial totals. CSV exports include local Delivered order data only.

Notifications are a separate admin tab before Settings. Messages include a title, body, and timestamp. Unread messages have an accent border, background, and dot. Clicking a message or Mark all as read removes the unread styling and persists the read state.

Checkout saves a local demo order only. Cash on Delivery and PayPal do not process payment. Corporate inquiries are saved locally; no email is sent. Admin sign-in and logout use a demo session in sessionStorage. The admin route checks this local preview session. Password recovery sends no email. Preview password changes last only until page reload. Demo credentials: admin@heartmadezone.com / HeartMade123!. Shop records remain local demo data.

Uploaded images are resized locally before saving. Browser storage capacity is limited; storage errors display a notice. Contact and social links open their usual external applications or websites. Policy buttons indicate that policy text was not supplied in the original source.

## Verification

See SETUP_AR.md for verification details for this revision.

## Asset credits

Images are retained from the original Pexels assets: `15122645`, `37827277`, and `36757968`. Bundled fonts are Instrument Serif, Caveat, and Plus Jakarta Sans from Google Fonts; their licenses are included. Icons are provided by Bootstrap Icons. Assets are local and do not require a CDN at runtime.
