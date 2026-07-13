import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CamPulse — the pulse of your campus",
  description: "Everything your campus, in one place.",
  icons: {
    // Theme-aware: dark logo for dark OS, light logo for light OS.
    icon: [
      { url: "/brand/campulse-dark.jpg", media: "(prefers-color-scheme: dark)" },
      { url: "/brand/campulse-light.jpg", media: "(prefers-color-scheme: light)" },
    ],
    apple: "/brand/campulse-dark.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
