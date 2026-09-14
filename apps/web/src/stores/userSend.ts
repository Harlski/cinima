import { defineStore } from "pinia";
import { ref } from "vue";
import {
  USER_SEND_LUNA,
  defaultUserSendNoteId,
  displayName,
  formatWallet,
  userSendMemoForNote,
  userSendNoteLuna,
  type UserSendNoteId,
} from "@cinima/shared";
import {
  demoEnabledOutsidePay,
  isNimiqPay,
  payUserMessage,
  sendPayTransaction,
} from "@/lib/nimiqPay";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";

export type PendingUserSend =
  | {
      kind: "title";
      toWallet: string;
      handle: string | null;
      titleId: string;
    }
  | {
      kind: "comment";
      toWallet: string;
      handle: string | null;
      commentId: number;
    };

export const useUserSendStore = defineStore("userSend", () => {
  const pending = ref<PendingUserSend | null>(null);
  const lastAttached = ref<PendingUserSend | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const { request } = useApi();

  const previewing = ref(false);
  const noteId = ref<UserSendNoteId>(defaultUserSendNoteId("title"));

  function offer(next: PendingUserSend, opts?: { preview?: boolean }) {
    pending.value = next;
    error.value = null;
    previewing.value = !!opts?.preview;
    noteId.value = defaultUserSendNoteId(next.kind);
  }

  function selectNote(id: UserSendNoteId) {
    noteId.value = id;
  }

  function cancel() {
    if (busy.value) return;
    pending.value = null;
    error.value = null;
    previewing.value = false;
  }

  async function payTo(toWallet: string): Promise<string> {
    const me = useAuthStore().user;
    const memo = userSendMemoForNote(
      noteId.value,
      displayName(me?.handle, me?.walletAddress ?? "")
    );
    if (demoEnabledOutsidePay()) {
      return `demo:user-send:${Date.now()}`;
    }
    if (!isNimiqPay()) throw new Error("Open Cinima inside Nimiq Pay to Send");
    return sendPayTransaction({
      recipient: formatWallet(toWallet),
      valueLuna: USER_SEND_LUNA,
      data: memo,
    });
  }

  async function confirm(): Promise<boolean> {
    const current = pending.value;
    if (!current || busy.value) return false;
    if (previewing.value || userSendNoteLuna(noteId.value) <= 0) {
      pending.value = null;
      previewing.value = false;
      error.value = null;
      return true;
    }
    busy.value = true;
    error.value = null;
    try {
      const txHash = await payTo(current.toWallet);
      if (current.kind === "title") {
        await request("/thanks/send", {
          method: "POST",
          body: JSON.stringify({
            toWallet: current.toWallet,
            titleId: current.titleId,
            txHash,
          }),
        });
      } else {
        await request(`/comments/${current.commentId}/thanks/send`, {
          method: "POST",
          body: JSON.stringify({ txHash }),
        });
      }
      pending.value = null;
      lastAttached.value = current;
      return true;
    } catch (err) {
      error.value = payUserMessage(err);
      return false;
    } finally {
      busy.value = false;
    }
  }

  return {
    pending,
    lastAttached,
    busy,
    error,
    noteId,
    offer,
    selectNote,
    cancel,
    confirm,
  };
});
