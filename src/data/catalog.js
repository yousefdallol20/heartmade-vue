// ===================== SHARED DATA =====================
import workshopImage from "../assets/images/pexels-15122645.jpg";
export { workshopImage };
import shelvesImage from "../assets/images/pexels-37827277.jpg";
export { shelvesImage };
import handsImage from "../assets/images/pexels-36757968.jpg";
export { handsImage };

export const fallbackProducts = [
  {
    id: "fb1",
    name: "Sunlit Bloom Greeting Card",
    creator: "Paper Studio",
    price: 4.0,
    category: "Cards",
    image_url: handsImage,
    description:
      "A hand-pressed floral greeting card with a blank interior for your personal messages.",
    story:
      "Crafted with care by talented hands in our Amman workshop. Each piece represents hours of dedicated craftsmanship, skill building, and creative expression.",
    stock: 50,
    featured: true,
  },
  {
    id: "fb2",
    name: "Handcrafted Minimalist Notebook",
    creator: "Paper Studio",
    price: 8.0,
    category: "Stationery",
    image_url: workshopImage,
    description:
      "Recycled paper notebook bound meticulously for your daily notes and sketches.",
    story:
      "Crafted with care by talented hands in our Amman workshop. Each piece represents hours of dedicated craftsmanship, skill building, and creative expression.",
    stock: 30,
    featured: true,
  },
  {
    id: "fb3",
    name: "Terracotta Clay Planter",
    creator: "Clay Studio",
    price: 16.5,
    category: "Lifestyle & Décor",
    image_url: shelvesImage,
    description:
      "Handcrafted clay pot designed to bring warmth and green life to your workspace or home.",
    story:
      "Shaped and fired meticulously by our artisans to bring warmth and green life to your workspace.",
    stock: 20,
    featured: true,
  },
  {
    id: "fb4",
    name: "Botanical Pressed Frame",
    creator: "Art Studio",
    price: 18.0,
    category: "Frames",
    image_url: handsImage,
    description:
      "Real pressed leaves encased in a sleek double-glass wooden frame.",
    story:
      "Preserving nature’s quiet beauty into functional art pieces for your daily living spaces.",
    stock: 15,
    featured: true,
  },
  {
    id: "fb5",
    name: "Embroidered Linen Tote Bag",
    creator: "Textile Studio",
    price: 14.0,
    category: "Bags",
    image_url: workshopImage,
    description:
      "Durable organic linen tote bag featuring custom hand-embroidered botanical patterns.",
    story:
      "Created by skilled artisans combining traditional needlework with modern everyday functionality.",
    stock: 25,
    featured: true,
  },
  {
    id: "fb6",
    name: "Hand-Woven Cotton Scarf",
    creator: "Weaving Studio",
    price: 22.0,
    category: "Wearables",
    image_url: shelvesImage,
    description:
      "Soft, lightweight, hand-woven cotton scarf crafted on traditional looms.",
    story:
      "Designed to offer cozy comfort while supporting local heritage weaving techniques.",
    stock: 12,
    featured: true,
  },
  {
    id: "fb7",
    name: "Ceramic Trinket Dish",
    creator: "Clay Studio",
    price: 12.5,
    category: "Accessories",
    image_url: handsImage,
    description:
      "Delicate hand-glazed ceramic dish perfect for rings, keys, and small keepsakes.",
    story:
      "Shaped by hand and glazed with earthy tones to add a refined touch to your tabletop.",
    stock: 40,
    featured: true,
  },
  {
    id: "fb8",
    name: "Warm Wishes Curated Gift Set",
    creator: "Gift Studio",
    price: 28.0,
    category: "Gifting",
    image_url: shelvesImage,
    description:
      "A curated box including a soy candle, a ceramic mug, and a handmade greeting card.",
    story:
      "Assembled with love to offer a complete gifting experience for your loved ones on special occasions.",
    stock: 18,
    featured: true,
  },
  {
    id: "fb9",
    name: "Upcoming Ceramic Teapot",
    creator: "Clay Studio",
    price: 32.0,
    category: "Soon",
    image_url: workshopImage,
    description:
      "An upcoming hand-thrown ceramic teapot currently being glazed and perfected.",
    story:
      "A future masterpiece currently in production by our talented Heart-Workers. Stay tuned!",
    stock: 0,
    featured: false,
  },
];

export const categories = [
  "All",
  "Cards",
  "Stationery",
  "Lifestyle & Décor",
  "Frames",
  "Wearables",
  "Bags",
  "Accessories",
  "Gifting",
  "Soon",
];

export const jordanCities = [
  { id: "amman", name: "Amman", fee: 2.0 },
  { id: "zarqa", name: "Zarqa", fee: 3.0 },
  { id: "irbid", name: "Irbid", fee: 3.0 },
  { id: "balqa", name: "Balqa / Salt", fee: 3.0 },
  { id: "aqaba", name: "Aqaba", fee: 4.0 },
  { id: "madaba", name: "Madaba", fee: 3.0 },
  { id: "jerash", name: "Jerash", fee: 3.0 },
  { id: "ajloun", name: "Ajloun", fee: 3.0 },
  { id: "karak", name: "Karak", fee: 4.0 },
  { id: "tafilah", name: "Tafilah", fee: 4.0 },
  { id: "maan", name: "Ma'an", fee: 4.0 },
  { id: "mafraq", name: "Mafraq", fee: 3.5 },
];
