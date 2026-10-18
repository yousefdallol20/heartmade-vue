import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { addToCart, navigate } = vi.hoisted(() => ({
  addToCart: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../src/stores/shop.js", () => ({ addToCart }));
vi.mock("../src/composables/navigation.js", () => ({
  useNavigation: () => ({ navigate }),
}));

import ProductCard from "../src/components/ProductCard.vue";

const product = {
  id: 10,
  name: "Celebration Box",
  description: "A thoughtful handmade gift",
  category: "Gifts",
  price: 29,
  stock: 4,
  image_url: "/box.jpg",
};

describe("ProductCard", () => {
  beforeEach(() => {
    addToCart.mockClear();
    navigate.mockClear();
  });

  it("shows the product name and formatted price", () => {
    const wrapper = mount(ProductCard, { props: { product, catalog: true } });
    expect(wrapper.text()).toContain("Celebration Box");
    expect(wrapper.text()).toContain("29.00 JD");
  });

  it("adds an available product to the cart", async () => {
    const wrapper = mount(ProductCard, { props: { product, catalog: true } });
    await wrapper.get("button").trigger("click");
    expect(addToCart).toHaveBeenCalledWith(product);
  });

  it("disables ordering when stock is empty", () => {
    const wrapper = mount(ProductCard, {
      props: { product: { ...product, stock: 0 }, catalog: true },
    });
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Coming Soon");
  });

  it("opens the selected product", async () => {
    const wrapper = mount(ProductCard, { props: { product, catalog: true } });
    await wrapper.get(".cat-thumb").trigger("click");
    expect(navigate).toHaveBeenCalledWith("product.html?id=10");
  });
});
