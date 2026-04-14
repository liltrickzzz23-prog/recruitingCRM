import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recruiting CRM",
  description: "Hiring dashboard for small businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
