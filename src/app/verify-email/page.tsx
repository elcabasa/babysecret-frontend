import { Header } from "@/components/layout/header";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-md">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-3xl font-medium text-[#102a43]">
            Verify your email
          </h1>

          {email ? (
            <div className="mt-6">
              <VerifyEmailForm email={decodeURIComponent(email)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#334f6d]">
              We could not find the email to verify. Please register again.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
