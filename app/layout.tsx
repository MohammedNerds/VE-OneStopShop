import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nerdio VE Tools",
  description: "Value Engineering Tools Portal — Nerdio",
  icons: {
    icon: "https://getnerdio.com/wp-content/uploads/2026/01/nerdio-logo-square.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-poppins antialiased">{children}</body>
    </html>
  );
}
