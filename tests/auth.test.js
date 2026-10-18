import { beforeEach, describe, expect, it, vi } from "vitest";

function response(body, { status = 200, ok = true } = {}) {
  return {
    ok,
    status,
    text: vi.fn().mockResolvedValue(
      body === "" ? "" : JSON.stringify(body),
    ),
  };
}

describe("Laravel API client", () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.fetch = vi.fn();
  });

  it("sends GET requests with cookies enabled", async () => {
    fetch.mockResolvedValue(response({ data: [1, 2] }));
    const { backendRequest } = await import("../src/stores/auth.js");

    await expect(backendRequest("/api/products")).resolves.toEqual({
      data: [1, 2],
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/products",
      expect.objectContaining({ method: "GET", credentials: "include" }),
    );
  });

  it("sends JSON and the XSRF token for modifying requests", async () => {
    document.cookie = "XSRF-TOKEN=test%20token; path=/";
    fetch.mockResolvedValue(response({ success: true }));
    const { backendRequest } = await import("../src/stores/auth.js");

    await backendRequest("/api/orders", {
      method: "POST",
      body: { customer_name: "Yousef" },
    });

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/orders",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ customer_name: "Yousef" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-XSRF-TOKEN": "test token",
        }),
      }),
    );
  });

  it("returns Laravel validation errors in a readable exception", async () => {
    fetch.mockResolvedValue(
      response(
        { message: "Invalid data", errors: { email: ["Email is required."] } },
        { status: 422, ok: false },
      ),
    );
    const { backendRequest } = await import("../src/stores/auth.js");

    await expect(backendRequest("/api/orders")).rejects.toMatchObject({
      message: "Email is required.",
      status: 422,
      errors: { email: ["Email is required."] },
    });
  });

  it("treats an unauthorized admin session as signed out", async () => {
    fetch.mockResolvedValue(
      response({ message: "Unauthenticated" }, { status: 401, ok: false }),
    );
    const { checkSession } = await import("../src/stores/auth.js");

    await expect(checkSession()).resolves.toBe(false);
  });

  it("rejects unsupported authentication actions", async () => {
    const { authRequest } = await import("../src/stores/auth.js");
    await expect(authRequest("delete-account")).rejects.toThrow(
      "Unsupported authentication action.",
    );
  });
});
