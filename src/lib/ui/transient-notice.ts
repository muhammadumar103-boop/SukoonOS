import type { FormNoticeTone } from "@/components/data-display/form-notice";

const transientNoticeStorageKey = "sukoonos.local.flash-notice.v1";

export type TransientNotice = {
  message: string;
  tone: FormNoticeTone;
};

function noticeStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function readTransientNotice() {
  const storage = noticeStorage();
  const raw = storage?.getItem(transientNoticeStorageKey);

  if (!raw) {
    return null;
  }

  storage?.removeItem(transientNoticeStorageKey);

  try {
    const parsed = JSON.parse(raw) as Partial<TransientNotice>;
    if (!parsed.message || (parsed.tone !== "error" && parsed.tone !== "info" && parsed.tone !== "success")) {
      return null;
    }

    return parsed as TransientNotice;
  } catch {
    return null;
  }
}

export function writeTransientNotice(notice: TransientNotice) {
  noticeStorage()?.setItem(transientNoticeStorageKey, JSON.stringify(notice));
}
