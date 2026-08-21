import { computed, ref } from "vue";
import {
  demoEnabledOutsidePay,
  getNimiq,
  isNimiqPay,
  listPayAccounts,
  sendPayTransaction,
  signPayMessage,
} from "@/lib/nimiqPay";

const ready = ref(false);
const inPay = ref(isNimiqPay());
const initError = ref<string | null>(null);
let bootPromise: Promise<void> | null = null;

async function bootProvider() {
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    inPay.value = isNimiqPay();
    if (!inPay.value) {
      ready.value = true;
      return;
    }
    try {
      await getNimiq();
      inPay.value = true;
    } catch (e) {
      initError.value = e instanceof Error ? e.message : String(e);
      inPay.value = isNimiqPay();
    } finally {
      ready.value = true;
    }
  })();
  return bootPromise;
}

/**
 * UI-facing Pay status. Provider itself stays outside Vue reactivity
 * (see `@/lib/nimiqPay`).
 */
export function useNimiq() {
  void bootProvider();

  return {
    isInPay: inPay,
    isReady: ready,
    initError,
    demoAvailable: computed(() => demoEnabledOutsidePay()),
    ensureInit: bootProvider,
    listAccounts: listPayAccounts,
    signMessage: signPayMessage,
    sendTransaction: async (params: { to: string; value: number; data?: string }) =>
      sendPayTransaction({
        recipient: params.to,
        valueLuna: params.value,
        data: params.data || "",
      }),
  };
}
