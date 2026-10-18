import { beforeEach, describe, expect, it, vi } from "vitest";

const product = {
  id: 501,
  name: "Test Gift",
  description: "Handmade gift",
  subtitle: "Test subtitle",
  category: "Gifts",
  price: 12.5,
  stock: 3,
  image_url: "/gift.jpg",
};

async function loadShop(products = [product]) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(
      JSON.stringify({ data: products, last_page: 1 }),
    ),
  });
  const shop = await import("../src/stores/shop.js");
  await shop.loadStoreProducts();
  return shop;
}

describe("shopping cart", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("loads products from Laravel", async () => {
    const shop = await loadShop();
    expect(shop.products.value).toEqual([product]);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/products?page=1",
      expect.any(Object),
    );
  });

  it("adds products and calculates the subtotal", async () => {
    const shop = await loadShop();
    shop.addToCart(product, 2);

    expect(shop.cart.value).toEqual([{ id: product.id, qty: 2 }]);
    expect(shop.cartCount.value).toBe(1);
    expect(shop.subtotal.value).toBe(25);
  });

  it("never exceeds available stock", async () => {
    const shop = await loadShop();
    shop.addToCart(product, 99);

    expect(shop.cart.value[0].qty).toBe(3);
    shop.addToCart(product, 1);
    expect(shop.cart.value[0].qty).toBe(3);
  });

  it("does not add unavailable products", async () => {
    const unavailable = { ...product, id: 502, stock: 0 };
    const shop = await loadShop([unavailable]);
    shop.addToCart(unavailable);

    expect(shop.cart.value).toEqual([]);
    expect(shop.notice.value).toContain("unavailable");
  });

  it("updates quantity, removes items, and persists the cart", async () => {
    const shop = await loadShop();
    shop.addToCart(product, 2);
    shop.updateQty(product.id, -1);
    expect(shop.cart.value[0].qty).toBe(1);

    shop.removeFromCart(product.id);
    expect(shop.cart.value).toEqual([]);
    expect(JSON.parse(localStorage.getItem("heartmade_cart"))).toEqual([]);
  });
});
