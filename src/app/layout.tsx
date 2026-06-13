import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weight Game",
  description: "A friendly weight-loss accountability challenge.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="mx-auto w-full max-w-md px-4 py-6 sm:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
