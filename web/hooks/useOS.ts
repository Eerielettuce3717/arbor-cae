"use client";

import { useEffect, useState } from "react";

export type OS = "macos" | "windows" | "linux" | "other";

type NavigatorUAData = {
  platform: string;
  mobile: boolean;
};

function readUserAgentData(): NavigatorUAData | undefined {
  const data = (navigator as Navigator & { userAgentData?: NavigatorUAData })
    .userAgentData;
  if (!data || typeof data.platform !== "string") return undefined;
  return data;
}

function isTouchMac(): boolean {
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function detectOS(): OS {
  if (typeof navigator === "undefined") return "other";

  const uaData = readUserAgentData();
  if (uaData) {
    if (uaData.mobile) return "other";
    const platform = uaData.platform.toLowerCase();
    if (platform.includes("win")) return "windows";
    if (platform.includes("mac")) return isTouchMac() ? "other" : "macos";
    if (platform.includes("linux") || platform.includes("chrome os")) {
      return "linux";
    }
  }

  const ua = navigator.userAgent;
  const platform = navigator.platform ?? "";
  const haystack = `${ua} ${platform}`;

  if (/Android.+Mobile|iPhone|iPod/i.test(ua)) return "other";
  if (/iPad/i.test(ua) || isTouchMac()) return "other";

  if (/Windows|Win64|Win32/i.test(haystack)) return "windows";
  if (/Linux|X11|CrOS/i.test(haystack) && !/Android/i.test(haystack)) {
    return "linux";
  }
  if (/Mac OS X|Macintosh|MacIntel/i.test(haystack)) return "macos";

  return "other";
}

/**
 * Client-only OS detection. Returns `"other"` during SSR and the first
 * client render so Next.js does not hit a hydration mismatch.
 */
export function useOS(): OS {
  const [os, setOs] = useState<OS>("other");

  useEffect(() => {
    setOs(detectOS());
  }, []);

  return os;
}
