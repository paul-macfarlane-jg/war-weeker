import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";

import { PwaSetup } from "@/components/pwa-setup";
import { APP_THEME_COLOR } from "@/lib/pwa";

import "./globals.css";

const fontPresetSans = Inter({
  variable: "--font-preset-sans",
  subsets: ["latin"],
});

const fontPresetSerif = Lora({
  variable: "--font-preset-serif",
  subsets: ["latin"],
});

const fontPresetMono = JetBrains_Mono({
  variable: "--font-preset-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "War Weeker",
  description: "One place to follow War Week.",
  // iOS Add to Home Screen: launch full-screen with this name and icon.
  appleWebApp: {
    capable: true,
    title: "War Weeker",
    statusBarStyle: "default",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
  // Next emits only `mobile-web-app-capable`; older iOS reads this one.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = { themeColor: APP_THEME_COLOR };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontPresetSans.variable} ${fontPresetSerif.variable} ${fontPresetMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        {children}
        <PwaSetup />
      </body>
    </html>
  );
}
