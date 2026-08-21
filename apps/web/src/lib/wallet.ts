import {
  demoEnabledOutsidePay,
  isNimiqPay,
  listPayAccounts,
  sendPayTransaction,
  signPayMessage,
} from "./nimiqPay";

export type SignResult = {
  signerPublicKey: string;
  signature: string;
  demoWallet?: string;
  account?: string;
};

export async function signChallenge(message: string): Promise<SignResult> {
  if (demoEnabledOutsidePay()) {
    const wallet =
      localStorage.getItem("nimcharts.demoWallet") || "NQ05DEMONIMCHARTSCYCLETWOWALLET0001";
    localStorage.setItem("nimcharts.demoWallet", wallet);
    return {
      signerPublicKey: btoa("demo-pubkey"),
      signature: btoa(`sig:${message}`),
      demoWallet: wallet,
    };
  }

  if (!isNimiqPay()) {
    throw new Error("Open NimCharts inside Nimiq Pay (or use ?demo=1 locally)");
  }

  const accounts = await listPayAccounts();
  const signed = await signPayMessage(message);
  return { ...signed, account: accounts[0] };
}

export async function sendPayment(opts: {
  recipient: string;
  amountLuna: number;
  memo: string;
}): Promise<string> {
  if (demoEnabledOutsidePay()) {
    return `demo:${opts.memo}:${Date.now()}`;
  }
  if (!isNimiqPay()) throw new Error("Not in Nimiq Pay environment");
  return sendPayTransaction({
    recipient: opts.recipient,
    valueLuna: opts.amountLuna,
    data: opts.memo,
  });
}

export async function sendTip(opts: {
  recipient: string;
  amountLuna: number;
  memo: string;
}): Promise<string> {
  return sendPayment(opts);
}
