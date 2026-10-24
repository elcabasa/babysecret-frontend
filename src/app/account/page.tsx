import { redirect } from "next/navigation";
import Link from "next/link";

import { Header } from "@/components/layout/header";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-2xl">
        {!user.isVerified && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-amber-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#102a43]">
              Your email has not been verified yet.
            </p>
            <Link
              href={`/verify-email?email=${encodeURIComponent(user.email ?? "")}`}
              className="shrink-0 rounded-full bg-[#3051a0] px-5 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#26407f]"
            >
              Verify email
            </Link>
          </div>
        )}

        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-3xl font-medium text-[#102a43]">Your account</h1>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between border-b border-[#e6edf7] pb-3">
              <dt className="text-[#62809e]">Name</dt>
              <dd className="font-medium text-[#102a43]">
                {user.name || user.email}
              </dd>
            </div>
            <div className="flex justify-between border-b border-[#e6edf7] pb-3">
              <dt className="text-[#62809e]">Email</dt>
              <dd className="font-medium text-[#102a43]">{user.email}</dd>
            </div>
            <div className="flex justify-between border-b border-[#e6edf7] pb-3">
              <dt className="text-[#62809e]">Email verified</dt>
              <dd className="font-medium text-[#102a43]">
                {user.isVerified ? "Yes" : "No"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#62809e]">Sign-in method</dt>
              <dd className="font-medium capitalize text-[#102a43]">
                {user.authProvider}
              </dd>
            </div>
          </dl>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/orders"
              className="rounded-full border border-[#d6e0f0] bg-white px-5 py-3 text-sm font-semibold text-[#102a43] transition hover:bg-[#f3f7ff]"
            >
              My Orders
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>
    </main>
  );
}
