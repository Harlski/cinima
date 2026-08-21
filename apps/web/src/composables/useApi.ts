import { ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { demoEnabledOutsidePay, isNimiqPay, payHeaders } from "@/lib/api";

const apiBase = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function useApi() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    loading.value = true;
    error.value = null;
    try {
      const authStore = useAuthStore();
      const headers: Record<string, string> = {
        ...(payHeaders() as Record<string, string>),
        ...(options.headers as Record<string, string>),
      };
      if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`;

      const demoQ =
        demoEnabledOutsidePay() && !path.includes("demo=")
          ? `${path.includes("?") ? "&" : "?"}demo=1`
          : "";
      const url = path.startsWith("http") ? path : `${apiBase}/api${path}${demoQ}`;
      const response = await fetch(url, { ...options, headers });

      // Proxy / API restart can return empty HTML — surface a clear error
      const text = await response.text();
      let data: Record<string, unknown> = {};
      try {
        data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
      } catch {
        throw new Error(
          response.ok
            ? "Invalid API response"
            : `API error: ${response.status}${text ? ` (${text.slice(0, 80)})` : ""}`
        );
      }

      if (!response.ok) {
        const msg = String(data.error || "");
        if (msg) throw new Error(msg);
        if (response.status >= 500) {
          throw new Error("API unavailable — wait a second and tap Retry (dev server may be restarting)");
        }
        throw new Error(`API error: ${response.status}`);
      }
      return data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Request failed";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    request,
    loading,
    error,
    isNimiqPay,
    demoEnabled: demoEnabledOutsidePay,
  };
}
