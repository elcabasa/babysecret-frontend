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

  // Derive the site URL from the request host so OAuth redirects work on
  // localhost, Vercel, and the production domain.
  trustHost: true,

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
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();

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

      // Allow Google to authenticate an existing WooCommerce customer
      // with the same email address.
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
      // Credentials login does not need the Google logic.
      if (account?.provider !== "google") {
        return true;
      }

      const email = String(
        user.email ?? (profile as { email?: string })?.email ?? "",
      )
        .toLowerCase()
        .trim();

      if (!email) {
        console.error("[auth] Google sign-in failed: no email returned");
        return false;
      }

      try {
        const existing = await getCustomerByEmail(email);

        // ------------------------------------------------------------
        // EXISTING CUSTOMER
        // ------------------------------------------------------------
        if (existing) {
          // Mark the email as verified because Google has verified it.
          await updateWooCustomer(existing.id, {
            meta_data: [
              {
                key: "email_verified",
                value: "true",
              },
            ],
          });

          const record = user as Record<string, unknown>;

          // IMPORTANT:
          // Use the existing WooCommerce customer ID.
          record.id = String(existing.id);

          record.emailVerified = true;

          // This describes how this session was authenticated.
          // We do NOT change the customer's stored auth_provider.
          record.authProvider = "google";

          record.role =
            existing.role === "administrator" ? "admin" : "customer";

          console.log(
            `[auth] Google sign-in successful for existing customer ${existing.id}`,
          );

          return true;
        }

        // ------------------------------------------------------------
        // NEW CUSTOMER
        // ------------------------------------------------------------
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

          // Google users don't need to know this password.
          password: crypto.randomUUID(),

          authProvider: "google",

          emailVerified: true,
        });

        const record = user as Record<string, unknown>;

        record.id = created.id;
        record.emailVerified = true;
        record.authProvider = "google";
        record.role = created.role;

        console.log(
          `[auth] Google sign-in successful: created customer ${created.id}`,
        );

        return true;
      } catch (error) {
        console.error("[auth] Google sign-in failed:", error);

        return false;
      }
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();

  return session?.user ?? null;
}