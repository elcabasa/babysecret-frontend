import { Header } from "@/components/layout/header";
import { LoginForm } from "@/components/auth/login-form";

const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; verified?: string }>;
}) {
  const { error, verified } = await searchParams;

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-md">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-3xl font-medium text-[#102a43]">Welcome back</h1>
          <p className="mt-2 text-sm text-[#334f6d]">
            Sign in to your Baby Secret account.
          </p>

          {verified && (
            <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
              Your email has been verified. You can now sign in.
            </p>
          )}

          <div className="mt-6">
            <LoginForm error={error} googleEnabled={googleEnabled} />
          </div>
        </div>
      </div>
    </main>
  );
}
