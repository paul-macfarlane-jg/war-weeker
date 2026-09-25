/**
 * Evidence for the Privacy and Terms pages: screenshots of /privacy and
 * /terms at 375px, plus /sign-in and the /about footer (so the new links
 * are visible), and a horizontal-overflow sweep across widths. Saves under
 * test-results/privacy-terms/.
 *
 * All three pages are public, so no session is needed. Needs a production
 * build, the seeded local Postgres (run `pnpm seed:all` first so /sign-in
 * has XI's theme), and Google Chrome. Starts its own server on port 3316:
 *   pnpm tsx scripts/privacy-terms-evidence.ts
 */
import { loadEnvConfig } from "@next/env";
import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

loadEnvConfig(process.cwd());

const PORT = 3316;
const BASE_URL = `http://localhost:${PORT}`;
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve(process.cwd(), "test-results/privacy-terms");
const AUTH_SECRET = `evidence-only-secret-${randomUUID()}`;

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
    env: {
      ...process.env,
      BETTER_AUTH_SECRET: AUTH_SECRET,
      BETTER_AUTH_URL: BASE_URL,
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
    },
    stdio: "ignore",
    detached: true,
  });
  const dir = mkdtempSync(path.join(os.tmpdir(), "privacy-terms-evidence-"));
  let chrome: ChildProcess | undefined;

  try {
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const up = await fetch(`${BASE_URL}/sign-in`).then(
        (r) => r.ok,
        () => false,
      );
      if (up) break;
    }

    chrome = spawn(
      CHROME,
      [
        "--headless=new",
        "--remote-debugging-port=9316",
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
          await fetch("http://127.0.0.1:9316/json/list")
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
    const capture = async (
      name: string,
      { fullPage = false, scrollToFooter = false } = {},
    ) => {
      if (scrollToFooter) {
        await evaluate<void>(
          "document.querySelector('footer').scrollIntoView({ block: 'center' })",
        );
      } else {
        await evaluate<void>("window.scrollTo(0, 0)");
      }
      await sleep(300);
      if (fullPage) {
        const { contentSize } = await page.send<{
          contentSize: { width: number; height: number };
        }>("Page.getLayoutMetrics");
        await page.send("Emulation.setDeviceMetricsOverride", {
          width: 375,
          height: Math.ceil(contentSize.height),
          deviceScaleFactor: 1,
          mobile: false,
        });
        await sleep(200);
      }
      const { data } = await page.send<{ data: string }>(
        "Page.captureScreenshot",
        { format: "png" },
      );
      writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, "base64"));
      console.log(`captured ${name}.png`);
      if (fullPage) await size(375, 900);
    };
    const overflow = () =>
      evaluate<number>(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth",
      );

    await size(375, 900);
    await open("/privacy");
    await capture("privacy-375", { fullPage: true });

    await open("/terms");
    await capture("terms-375", { fullPage: true });

    await open("/sign-in");
    await capture("sign-in-375");

    await open("/about");
    await capture("about-footer-375", { scrollToFooter: true });

    const lines: string[] = [];
    for (const width of [375, 768, 1280]) {
      await size(width, 900);
      for (const route of ["/privacy", "/terms", "/sign-in", "/about"]) {
        await open(route);
        const px = await overflow();
        lines.push(`${route} @${width}: ${px}`);
        console.log(`${route} @${width}: horizontal overflow ${px}px`);
      }
    }
    writeFileSync(path.join(OUT, "overflow.txt"), lines.join("\n") + "\n");

    const worst = Math.max(...lines.map((line) => Number(line.split(": ")[1])));
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
