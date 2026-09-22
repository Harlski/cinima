import { defineStore } from "pinia";
import { ref } from "vue";
import {
  USER_SEND_LUNA,
  defaultUserSendNoteId,
  displayName,
  formatWallet,
  isGuestbookThanksNoteId,
  isUserSendNoteId,
  userSendMemoForNote,
  userSendNoteLuna,
  type AchievementKind,
  type SendNoteId,
} from "@cinima/shared";
import {
  demoEnabledOutsidePay,
  isNimiqPay,
  sendPayTransaction,
  userSendFailure,
} from "@/lib/nimiqPay";
import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";
import { useMarqueeStore } from "@/stores/marquee";

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
    }
  | {
      kind: "guestbook";
      toWallet: string;
      handle: string | null;
    };

export const useUserSendStore = defineStore("userSend", () => {
  const pending = ref<PendingUserSend | null>(null);
  const lastAttached = ref<PendingUserSend | null>(null);
  const lastThanked = ref<PendingUserSend | null>(null);
  const receiptHash = ref<string | null>(null);
  const busy = ref(false);
  const error = ref<string | null>(null);
  const { request } = useApi();

  const previewing = ref(false);
  const noteId = ref<SendNoteId>(defaultUserSendNoteId("title"));
  /** Paid User Send hash held until the Guestbook row is written. */
  const heldHash = ref<string | null>(null);

  function offer(next: PendingUserSend, opts?: { preview?: boolean }) {
    pending.value = next;
    error.value = null;
    receiptHash.value = null;
    previewing.value = !!opts?.preview;
    heldHash.value = null;
    noteId.value = defaultUserSendNoteId(next.kind);
  }

  function selectNote(id: SendNoteId) {
    if (pending.value?.kind === "guestbook") {
      if (!isGuestbookThanksNoteId(id)) return;
    } else if (!isUserSendNoteId(id)) {
      return;
    }
    noteId.value = id;
  }

  function cancel() {
    if (busy.value || heldHash.value) return;
    pending.value = null;
    receiptHash.value = null;
    error.value = null;
    previewing.value = false;
  }

  function showReceipt(txHash: string) {
    const hash = String(txHash ?? "").trim();
    pending.value = null;
    error.value = null;
    previewing.value = false;
    receiptHash.value = hash || null;
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

  async function landThanks(current: PendingUserSend): Promise<AchievementKind[] | undefined> {
    if (current.kind === "title") {
      const data = await request<{ earnedAchievements?: AchievementKind[] }>("/thanks", {
        method: "POST",
        body: JSON.stringify({
          toWallet: current.toWallet,
          titleId: current.titleId,
        }),
      });
      return data.earnedAchievements;
    }
    if (current.kind !== "comment") return;
    const data = await request<{ earnedAchievements?: AchievementKind[] }>(
      `/comments/${current.commentId}/thanks`,
      { method: "POST" }
    );
    return data.earnedAchievements;
  }

  async function confirm(): Promise<boolean> {
    const current = pending.value;
    if (!current || busy.value) return false;
    if (previewing.value) {
      pending.value = null;
      previewing.value = false;
      error.value = null;
      return true;
    }
    busy.value = true;
    error.value = null;
    try {
      if (current.kind === "guestbook") {
        const txHash = heldHash.value ?? (await payTo(current.toWallet));
        heldHash.value = txHash;
        await request(`/users/${encodeURIComponent(current.toWallet)}/guestbook`, {
          method: "POST",
          body: JSON.stringify({ txHash, noteId: noteId.value }),
        });
        heldHash.value = null;
        lastAttached.value = current;
        showReceipt(txHash);
        return true;
      }
      const earnedAchievements = await landThanks(current);
      if (earnedAchievements?.length) {
        useMarqueeStore().enqueue(earnedAchievements);
      }
      lastThanked.value = current;
      if (userSendNoteLuna(noteId.value) <= 0) {
        pending.value = null;
        previewing.value = false;
        return true;
      }
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
      } else if (current.kind === "comment") {
        await request(`/comments/${current.commentId}/thanks/send`, {
          method: "POST",
          body: JSON.stringify({ txHash }),
        });
      }
      lastAttached.value = current;
      showReceipt(txHash);
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === "already_thanked") {
        heldHash.value = null;
        error.value = "You already thanked this Handle.";
        return false;
      }
      const failure = userSendFailure(err);
      error.value = failure.copy;
      if (failure.detail) {
        const target = (current.handle || current.toWallet).slice(0, 80);
        try {
          await request("/user-sends/failure", {
            method: "POST",
            body: JSON.stringify({
              kind: current.kind,
              target,
              detail: failure.detail,
            }),
          });
        } catch {
          // The dialog already shows Oops. The notice is best-effort.
        }
      }
      return false;
    } finally {
      busy.value = false;
    }
  }

  return {
    pending,
    lastAttached,
    lastThanked,
    receiptHash,
    busy,
    error,
    noteId,
    heldHash,
    offer,
    selectNote,
    cancel,
    showReceipt,
    confirm,
  };
});
