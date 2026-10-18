import { useRouter } from "vue-router";
export function useNavigation() {
  const router = useRouter();
  const path = (target) =>
    target
      .replace(/^index\.html/, "/")
      .replace(/^(catalog|product|checkout|story|b2b|admin)\.html/, "/$1")
      .replace("/b2b", "/corporate");
  const link = (target) => router.resolve(path(target)).href;
  const navigate = (target) => router.push(path(target));
  return { navigate, link };
}
