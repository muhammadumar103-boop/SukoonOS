import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SukoonOS",
  description: "The operating system for Sukoon Charity.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
