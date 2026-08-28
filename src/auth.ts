import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  authenticateWooCommerce,
  createWooCustomer,
  getCustomerByEmail,
  updateWooCustomer,
} from "@/lib/woocommerce-auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");

        if (!email || !password) return null;

        try {
          const { user } = await authenticateWooCommerce(email, password);
          return user;
        } catch {
          return null;
        }
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const custom = user as unknown as {
          id?: string;
          emailVerified?: boolean;
          authProvider?: "password" | "google";
          role?: "customer" | "admin";
        };
        token.id = custom.id;
        token.isVerified = Boolean(custom.emailVerified);
        token.authProvider = custom.authProvider;
        token.role = custom.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isVerified = Boolean(token.isVerified);
        session.user.authProvider = (token.authProvider ?? "password") as
          | "password"
          | "google";
        session.user.role = (token.role ?? "customer") as
          | "customer"
          | "admin";
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = String(user.email ?? (profile as { email?: string })?.email ?? "")
        .toLowerCase()
        .trim();

      if (!email) return false;

      const existing = await getCustomerByEmail(email);

      if (existing) {
        const provider = existing.meta_data?.find(
          (meta) => meta.key === "auth_provider"
        )?.value;

        if (provider === "password") {
          throw new Error("ACCOUNT_PASSWORD_COLLISION");
        }

        await updateWooCustomer(existing.id, {
          meta_data: [{ key: "email_verified", value: "true" }],
        });

        const record = user as Record<string, unknown>;
        record.id = String(existing.id);
        record.emailVerified = true;
        record.authProvider = "google";
        record.role = existing.role === "administrator" ? "admin" : "customer";
        return true;
      }

      const created = await createWooCustomer({
        email,
        firstName:
          (profile as { given_name?: string })?.given_name ??
          user.name?.split(" ")[0] ??
          "",
        lastName:
          (profile as { family_name?: string })?.family_name ??
          user.name?.split(" ").slice(1).join(" ") ??
          "",
        password: crypto.randomUUID(),
        authProvider: "google",
        emailVerified: true,
      });

      const record = user as Record<string, unknown>;
      record.id = created.id;
      record.emailVerified = true;
      record.authProvider = "google";
      record.role = created.role;
      return true;
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
