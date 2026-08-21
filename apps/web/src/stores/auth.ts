import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useApi } from "@/composables/useApi";
import {
  demoEnabledOutsidePay,
  isNimiqPay,
  listPayAccounts,
  signPayMessage,
} from "@/lib/nimiqPay";
import type {
  SessionUser,
  AuthChallengeResponse,
  AuthVerifyResponse,
  MeResponse,
} from "@cinima/shared";

const TOKEN_KEY = "cinima_token";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<SessionUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const ready = ref(false);

  const isAuthenticated = computed(() => !!token.value && !!user.value);
  const { request } = useApi();

  const checkSession = async () => {
    if (!token.value) return;
    try {
      const response = await request<MeResponse>("/me");
      user.value = response.user;
    } catch {
      token.value = null;
      user.value = null;
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const authenticate = async () => {
    loading.value = true;
    error.value = null;
    try {
      // Desktop / local: demo auth. Inside Pay: real wallet sign (nimiq.dev).
      if (demoEnabledOutsidePay()) {
        await devLogin();
        return;
      }
      if (!isNimiqPay()) {
        throw new Error("Open Cinima inside Nimiq Pay (or use ?demo=1 locally)");
      }

      // Prompt 1: share accounts (native dialog)
      const accounts = await listPayAccounts();
      const account = accounts[0]!;

      const challengeResp = await request<AuthChallengeResponse>("/auth/challenge");

      // Prompt 2: sign challenge (native dialog)
      const signResult = await signPayMessage(challengeResp.message);

      const verifyResp = await request<AuthVerifyResponse>("/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          nonce: challengeResp.nonce,
          message: challengeResp.message,
          signer: account,
          signerPublicKey: signResult.signerPublicKey,
          signature: signResult.signature,
          nimiqPayClient: true,
        }),
      });
      token.value = verifyResp.token;
      user.value = verifyResp.user;
      localStorage.setItem(TOKEN_KEY, verifyResp.token);
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Auth failed";
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const devLogin = async () => {
    const demoWallet =
      localStorage.getItem("cinima.demoWallet") || "NQ05DEMOCINIMACYCLETWOWALLET0000001";
    localStorage.setItem("cinima.demoWallet", demoWallet);

    const challengeResp = await request<AuthChallengeResponse>("/auth/challenge");
    const verifyResp = await request<AuthVerifyResponse>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({
        nonce: challengeResp.nonce,
        message: challengeResp.message,
        signerPublicKey: btoa("demo-pubkey"),
        signature: btoa(`sig:${challengeResp.message}`),
        demoWallet,
      }),
    });
    token.value = verifyResp.token;
    user.value = verifyResp.user;
    localStorage.setItem(TOKEN_KEY, verifyResp.token);
  };

  const boot = async () => {
    error.value = null;
    try {
      // Give the host a moment to inject window.nimiq / window.nimiqPay
      await new Promise((r) => setTimeout(r, 50));
      if (token.value) await checkSession();
      if (!user.value) await authenticate();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "boot_failed";
    } finally {
      ready.value = true;
    }
  };

  const setHandle = async (handle: string) => {
    await request("/me/handle", {
      method: "POST",
      body: JSON.stringify({ handle }),
    });
    await checkSession();
  };

  const logout = () => {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
  };

  return {
    token,
    user,
    loading,
    error,
    ready,
    isAuthenticated,
    checkSession,
    authenticate,
    devLogin,
    boot,
    setHandle,
    logout,
  };
});
