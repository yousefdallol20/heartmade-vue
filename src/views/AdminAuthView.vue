<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authRequest } from "../stores/auth.js";
const route = useRoute(),
  router = useRouter();
const mode = computed(() =>
  route.path.endsWith("forgot-password")
    ? "forgot"
    : route.path.endsWith("reset-password")
      ? "reset"
      : "login",
);
const email = ref(""),
  password = ref(""),
  confirmation = ref("");
const busy = ref(false),
  error = ref(""),
  success = ref(""),
  reveal = ref(false);
const title = computed(
  () =>
    ({
      login: "Welcome back.",
      forgot: "A fresh start.",
      reset: "Your new password.",
    })[mode.value],
);
watch(mode, () => {
  error.value = "";
  success.value = "";
  password.value = "";
  confirmation.value = "";
  reveal.value = false;
});
async function submit() {
  if (busy.value) return;
  const currentMode = mode.value;
  error.value = "";
  success.value = "";
  if (currentMode === "reset" && password.value !== confirmation.value) {
    error.value = "Passwords do not match.";
    return;
  }
  busy.value = true;
  try {
    if (currentMode === "login") {
      await authRequest("login", {
        email: email.value.trim(),
        password: password.value,
      });
      await router.replace("/admin");
    } else if (currentMode === "forgot") {
      const result = await authRequest("forgot-password", {
        email: email.value.trim(),
      });
      if (mode.value === currentMode) success.value = result.message;
    } else {
      // قراءة بيانات رابط الاستعادة الذي وصل بالبريد
      const resetEmail = String(route.query.email || "").trim();
      const resetToken = String(route.query.token || "").trim();

      if (!resetEmail || !resetToken) {
        throw new Error(
          "The reset link is incomplete. Open the link from your recovery email.",
        );
      }

      const result = await authRequest("reset-password", {
        email: resetEmail,
        token: resetToken,
        password: password.value,
        password_confirmation: confirmation.value,
      });

      password.value = "";
      confirmation.value = "";

      if (mode.value === currentMode) {
        success.value = result.message;
      }
    }
  } catch (err) {
    if (mode.value === currentMode) error.value = err.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="auth-page">
    <RouterLink to="/" class="logo-script auth-brand">Heart Made</RouterLink>
    <div class="auth-layout">
      <section class="auth-story">
        <span class="auth-eyebrow">HEART MADE ZONE · ADMIN SPACE</span>
        <h1>Made with care.<br /><em>Managed with heart.</em></h1>
        <p>
          A quiet space to care for your creations, your makers, and the stories
          behind every piece.
        </p>
        <div class="auth-heart" aria-hidden="true">
          <i class="bi bi-heart"></i>
        </div>
        <span class="auth-note">Small details. Meaningful impact.</span>
      </section>
      <section class="auth-card" aria-labelledby="auth-title">
        <div class="auth-icon" aria-hidden="true">
          <i
            :class="
              mode === 'login' ? 'bi bi-shield-lock' : 'bi bi-envelope-heart'
            "
          ></i>
        </div>
        <h2 id="auth-title">{{ title }}</h2>
        <p class="auth-description">
          {{
            mode === "login"
              ? "Sign in to your Heart Made admin space."
              : mode === "forgot"
                ? "Enter your admin email to receive a password reset link."
                : "Choose a strong password with at least 8 characters."
          }}
        </p>
        <p v-if="error" class="auth-message auth-error" role="alert">
          {{ error }}
        </p>
        <p v-if="success" class="auth-message auth-success" role="status">
          {{ success }}
        </p>
        <form v-if="!(mode === 'reset' && success)" @submit.prevent="submit">
          <fieldset :disabled="busy">
            <label v-if="mode !== 'reset'" for="admin-email"
              >Email address</label
            >
            <input
              v-if="mode !== 'reset'"
              id="admin-email"
              v-model="email"
              type="email"
              autocomplete="username"
              placeholder="you@heartmadezone.com"
              required
              maxlength="254"
            />
            <template v-if="mode !== 'forgot'">
              <label for="admin-password">{{
                mode === "reset" ? "New password" : "Password"
              }}</label>
              <div class="auth-password">
                <input
                  id="admin-password"
                  v-model="password"
                  :type="reveal ? 'text' : 'password'"
                  :autocomplete="
                    mode === 'reset' ? 'new-password' : 'current-password'
                  "
                  :minlength="mode === 'reset' ? 8 : undefined"
                  maxlength="200"
                  required
                />
                <button
                  type="button"
                  @click="reveal = !reveal"
                  :aria-label="reveal ? 'Hide password' : 'Show password'"
                >
                  <i :class="reveal ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
            </template>
            <template v-if="mode === 'reset'">
              <label for="admin-confirmation">Confirm password</label>
              <input
                id="admin-confirmation"
                v-model="confirmation"
                type="password"
                autocomplete="new-password"
                minlength="8"
                maxlength="200"
                required
              />
            </template>
            <RouterLink
              v-if="mode === 'login'"
              class="auth-forgot"
              to="/admin/forgot-password"
              >Forgot password?</RouterLink
            >
            <button class="auth-submit" type="submit">
              {{
                busy
                  ? "Please wait…"
                  : mode === "login"
                    ? "Sign in"
                    : mode === "forgot"
                      ? "Send reset link"
                      : "Update password"
              }}
              <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </button>
          </fieldset>
        </form>
        <RouterLink v-if="mode !== 'login'" class="auth-back" to="/admin/login"
          ><i class="bi bi-arrow-left"></i> Back to sign in</RouterLink
        >
        <RouterLink v-else class="auth-back" to="/"
          >Back to the storefront</RouterLink
        >
      </section>
    </div>
    <p class="auth-footer">Thoughtful things, made with love.</p>
  </main>
</template>
<style scoped>
.auth-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 15% 30%, #f0e3d9, transparent 55%), #fbf8f5;
  padding: 40px max(24px, calc((100vw - 1200px) / 2));
  color: #332d29;
}
.auth-brand {
  color: #b98876;
  text-decoration: none;
  font-size: 34px;
}
.auth-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  margin: 65px auto 35px;
}
.auth-eyebrow {
  font-size: 11px;
  letter-spacing: 2px;
  color: #a76551;
}
.auth-story h1 {
  font-family: Georgia, serif;
  font-size: clamp(38px, 4.5vw, 60px);
  line-height: 1.15;
  margin: 24px 0;
}
.auth-story h1 em {
  color: #bd6c59;
}
.auth-story p {
  color: #80716a;
  max-width: 380px;
  line-height: 1.8;
}
.auth-heart {
  height: 115px;
  display: flex;
  align-items: center;
  font-size: 72px;
  color: #c69680;
  transform: rotate(-12deg);
}
.auth-note,
.auth-footer {
  color: #9b877b;
  font-size: 12px;
}
.auth-card {
  background: #fffdfb;
  border: 1px solid #e9dcd1;
  border-radius: 28px;
  padding: 42px;
  box-shadow: 0 18px 60px #6244320a;
}
.auth-icon {
  width: 48px;
  height: 48px;
  background: #f4e9e1;
  border-radius: 15px;
  display: grid;
  place-items: center;
  color: #ad6853;
  font-size: 22px;
  margin-bottom: 22px;
}
.auth-card h2 {
  font-family: Georgia, serif;
  font-size: 36px;
  margin: 0 0 12px;
}
.auth-description {
  color: #87776d;
  font-size: 14px;
  line-height: 1.7;
  margin-bottom: 25px;
}
fieldset {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
label {
  display: block;
  font-size: 13px;
  margin: 20px 0 8px;
}
input {
  width: 100%;
  min-width: 0;
  background: #fbf8f5;
  border: 1px solid #e6d9ce;
  border-radius: 12px;
  padding: 14px;
  color: #332d29;
}
input:focus {
  outline: 2px solid #bd6c59;
  outline-offset: 2px;
}
.auth-password {
  position: relative;
}
.auth-password input {
  padding-right: 50px;
}
.auth-password button {
  position: absolute;
  right: 6px;
  top: 6px;
  bottom: 6px;
  width: 40px;
  border: 0;
  background: transparent;
  color: #937c70;
}
.auth-forgot {
  display: block;
  text-align: right;
  color: #a5624f;
  font-size: 13px;
  margin: 14px 0 0;
}
.auth-submit {
  width: 100%;
  background: #bd6c59;
  color: white;
  border: 0;
  padding: 15px 20px;
  border-radius: 30px;
  margin-top: 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
fieldset:disabled {
  opacity: 0.6;
}
.auth-back {
  display: block;
  text-align: center;
  color: #88756b;
  margin-top: 24px;
  font-size: 13px;
}
.auth-message {
  border-radius: 12px;
  padding: 14px;
  font-size: 14px;
  line-height: 1.6;
}
.auth-error {
  background: #faeae5;
  color: #98402e;
}
.auth-success {
  background: #eaf1e8;
  color: #466940;
}
.auth-footer {
  text-align: center;
  margin-top: 50px;
}
@media (max-width: 800px) {
  .auth-layout {
    grid-template-columns: 1fr;
    gap: 30px;
    margin-top: 35px;
  }
  .auth-story h1 {
    font-size: 38px;
  }
  .auth-heart,
  .auth-note {
    display: none;
  }
  .auth-card {
    padding: 28px;
  }
}
</style>
