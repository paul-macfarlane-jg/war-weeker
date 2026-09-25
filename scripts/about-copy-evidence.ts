/**
 * Evidence for the About page copy update (admin-polish D1): screenshots
 * `/about` at mobile and desktop widths and measures horizontal overflow at
 * 375, 768 and 1280px, saving results under test-results/about-copy/.
 *
 * `/about` is public and static, so this needs no session cookie or DB
 * writes. Needs a production build and Google Chrome. Starts its own server
 * on port 3311:
 *   pnpm tsx scripts/about-copy-evidence.ts
 */
import { loadEnvConfig } from "@next/env";
import { type ChildProcess, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

loadEnvConfig(process.cwd());

const PORT = 3311;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/about-copy");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function connect(wsUrl: string) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  let nextId = 1;
  const pending = new Map<number, (result: unknown) => void>();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    pending.get(message.id)?.(message.result);
    pending.delete(message.id);
  });
  return {
    send<T = Record<string, unknown>>(
      method: string,
      params: Record<string, unknown> = {},
    ): Promise<T> {
      const id = nextId++;
      ws.send(JSON.stringify({ id, method, params }));
      return new Promise((resolve) =>
        pending.set(id, resolve as (r: unknown) => void),
      );
    },
    close: () => ws.close(),
  };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = spawn("pnpm", ["start", "-p", String(PORT)], {
    env: { ...process.env },
    stdio: "ignore",
    detached: true,
  });
  const dir = mkdtempSync(path.join(os.tmpdir(), "about-copy-evidence-"));
  let chrome: ChildProcess | undefined;

  try {
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const up = await fetch(`${BASE_URL}/about`).then(
        (r) => r.ok,
        () => false,
      );
      if (up) break;
    }

    chrome = spawn(
      CHROME,
      [
        "--headless=new",
        "--remote-debugging-port=9311",
        `--user-data-dir=${dir}`,
        "--no-first-run",
        "about:blank",
      ],
      { stdio: "ignore" },
    );
    let wsUrl: string | undefined;
    for (let i = 0; i < 50 && !wsUrl; i++) {
      await sleep(200);
      try {
        const targets = (await (
          await fetch("http://127.0.0.1:9311/json/list")
        ).json()) as { type: string; webSocketDebuggerUrl: string }[];
        wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl;
      } catch {
        // Chrome is still starting.
      }
    }
    if (!wsUrl) throw new Error("Chrome did not start");
    const page = await connect(wsUrl);
    await page.send("Page.enable");
    await page.send("Network.enable");

    const evaluate = async <T>(expression: string): Promise<T> => {
      const { result, exceptionDetails } = await page.send<{
        result: { value: T };
        exceptionDetails?: { exception?: { description?: string } };
      }>("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (exceptionDetails) {
        throw new Error(exceptionDetails.exception?.description ?? expression);
      }
      return result.value;
    };
    const open = async (route: string) => {
      await page.send("Page.navigate", { url: `${BASE_URL}${route}` });
      await sleep(2_500);
    };
    const size = (width: number, height: number) =>
      page.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    const capture = async (name: string) => {
      await evaluate<void>("window.scrollTo(0, 0)");
      await sleep(300);
      const { data } = await page.send<{ data: string }>(
        "Page.captureScreenshot",
        { format: "png", captureBeyondViewport: true },
      );
      writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
      console.log(`captured ${name}.png`);
    };
    const overflow = () =>
      evaluate<number>(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth",
      );

    let overflowReport = "";
    let worst = 0;
    for (const [width, height] of [
      [375, 812],
      [768, 1024],
      [1280, 800],
    ] as const) {
      await size(width, height);
      await open("/about");
      const px = await overflow();
      worst = Math.max(worst, px);
      overflowReport += `${width}: ${px}\n`;
      console.log(`/about @${width}: horizontal overflow ${px}px`);
      if (width === 375) await capture("about-375");
      if (width === 1280) await capture("about-1280");
    }
    writeFileSync(path.join(OUT, "overflow.txt"), overflowReport);
    if (worst > 0) process.exitCode = 1;

    page.close();
  } finally {
    chrome?.kill();
    if (server.pid) process.kill(-server.pid, "SIGTERM");
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
