import type { Metadata } from "next";
import "./globals.css";

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export const metadata: Metadata = {
  title: {
    default: "Baby Secret | Gentle care for little ones",
    template: "%s | Baby Secret",
  },
  description:
    "Explore Baby Secret care products for babies and families.",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
