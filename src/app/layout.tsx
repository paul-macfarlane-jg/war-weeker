import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora } from "next/font/google";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fontPresetSans.variable} ${fontPresetSerif.variable} ${fontPresetMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
