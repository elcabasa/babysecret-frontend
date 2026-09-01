import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/data/site";
import { Providers } from "@/components/auth/session-provider";
import { auth } from "@/auth";
import { UserDataSync } from "@/components/auth/user-data-sync";

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export const metadata: Metadata = {
  title: {
    default: "Baby Secret | Gentle care for little ones",
    template: "%s | Baby Secret",
  },
  description: "Explore Baby Secret care products for babies and families.",
  metadataBase: new URL(siteConfig.url),
  openGraph: { type: "website", siteName: siteConfig.name, title: "Baby Secret | Gentle care for little ones", description: "Explore Baby Secret care products for babies and families." },
  twitter: { card: "summary_large_image", title: "Baby Secret | Gentle care for little ones", description: "Explore Baby Secret care products for babies and families." },
};

export default async function RootLayout({ children }: RootLayoutProps) {
  const session = await auth();

  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Providers session={session}>
          <UserDataSync />
          {children}
        </Providers>
      </body>
    </html>
  );
}
