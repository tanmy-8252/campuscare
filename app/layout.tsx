import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CampusCare — A better campus, together",
  description:
    "Report campus issues, connect your maintenance team, and follow every fix.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CampusCare",
    statusBarStyle: "default",
  },
  icons: { icon: "/favicon.svg", apple: "/icon-192.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#245b45",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
