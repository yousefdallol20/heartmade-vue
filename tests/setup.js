import { afterEach, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.cookie = "XSRF-TOKEN=; Max-Age=0; path=/";
});
