import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isVerified: boolean;
      authProvider: "password" | "google";
      role: "customer" | "admin";
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isVerified?: boolean;
    authProvider?: "password" | "google";
    role?: "customer" | "admin";
  }
}
