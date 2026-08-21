import { ref } from "vue";
import { encodeMemo, type PaymentMemo } from "@nimcharts/shared";
import { demoEnabledOutsidePay, isNimiqPay, sendPayTransaction } from "@/lib/nimiqPay";

const treasuryAddress = (import.meta.env.VITE_TREASURY_ADDRESS || "").trim();

export function usePayments() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sendTo = async (to: string, amountLuna: number, memo: PaymentMemo): Promise<string> => {
    loading.value = true;
    error.value = null;
    try {
      const encoded = encodeMemo(memo);
      if (demoEnabledOutsidePay()) {
        return `demo:${encoded}:${Date.now()}`;
      }
      if (!isNimiqPay()) throw new Error("Open NimCharts inside Nimiq Pay to pay");
      if (!to) throw new Error("Missing payment recipient");
      return await sendPayTransaction({
        recipient: to,
        valueLuna: amountLuna,
        data: encoded,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      error.value = message;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const sendPayment = async (amountLuna: number, memo: PaymentMemo, recipient?: string) =>
    sendTo(recipient || treasuryAddress, amountLuna, memo);

  const sendTip = async (toWallet: string, amountLuna: number) =>
    sendTo(toWallet, amountLuna, { type: "thanks", toWallet });

  return { sendPayment, sendTip, loading, error };
}
