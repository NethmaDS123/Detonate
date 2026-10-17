"use client";

import { useState } from "react";
import { buildShareText, type ShareResultInput } from "@/lib/shareResult";
import { siteOriginInBrowser } from "@/lib/siteUrl";

export function ShareResultButton(props: Omit<ShareResultInput, "siteOrigin">) {
  const [status, setStatus] = useState<"idle" | "copied" | "shared" | "failed">("idle");
  const shareText = buildShareText({ ...props, siteOrigin: siteOriginInBrowser() });

  async function share() {
    setStatus("idle");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: shareText });
        setStatus("shared");
        return;
      }
      await navigator.clipboard.writeText(shareText);
      setStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(shareText);
        setStatus("copied");
      } catch {
        setStatus("failed");
      }
    }
  }

  const label =
    status === "copied"
      ? "Copied"
      : status === "shared"
        ? "Shared"
        : status === "failed"
          ? "Copy failed"
          : "Share";

  return (
    <button type="button" className="btn" onClick={() => void share()}>
      {label}
    </button>
  );
}
