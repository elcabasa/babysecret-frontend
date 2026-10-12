import { Header } from "@/components/layout/header";
import { ResetForm } from "@/components/auth/reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-md">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-3xl font-medium text-[#102a43]">
            Choose a new password
          </h1>

          {token ? (
            <div className="mt-6">
              <ResetForm token={token} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-[#334f6d]">
              This reset link is missing its token. Please request a new link.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
