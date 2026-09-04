export type ShareClipboard = {
  writeText: (text: string) => Promise<void>;
};

/**
 * Copy a Share link through the clipboard.
 * Does not select or highlight any page text.
 */
export async function copyShareLink(
  url: string,
  clipboard?: ShareClipboard | null
): Promise<boolean> {
  if (!url) return false;
  const api =
    clipboard !== undefined
      ? clipboard
      : typeof navigator !== "undefined"
        ? navigator.clipboard
        : undefined;
  if (api?.writeText) {
    try {
      await api.writeText(url);
      return true;
    } catch {
      /* fall through to a detached copy */
    }
  }
  return copyShareLinkOffscreen(url);
}

function copyShareLinkOffscreen(url: string): boolean {
  if (typeof document === "undefined") return false;
  const el = document.createElement("textarea");
  el.value = url;
  el.setAttribute("readonly", "");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    el.remove();
  }
}
