import { describe, expect, it } from "vitest";

import { detectInstallPlatform } from "@/lib/install-platform";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

describe("detectInstallPlatform", () => {
  it("detects iPhone Safari as iOS", () => {
    expect(detectInstallPlatform(IPHONE_SAFARI, 5)).toBe("ios");
  });

  it("detects an iPad reporting a desktop Mac user agent as iOS", () => {
    expect(detectInstallPlatform(IPAD_DESKTOP_MODE, 5)).toBe("ios");
  });

  it("treats a real Mac (no touch points) as other", () => {
    expect(detectInstallPlatform(IPAD_DESKTOP_MODE, 0)).toBe("other");
  });

  it("detects Android Chrome as Android", () => {
    expect(detectInstallPlatform(ANDROID_CHROME, 5)).toBe("android");
  });

  it("treats desktop browsers as other", () => {
    expect(detectInstallPlatform(DESKTOP_CHROME, 0)).toBe("other");
  });
});
