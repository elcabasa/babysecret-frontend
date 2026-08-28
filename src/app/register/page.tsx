import { Header } from "@/components/layout/header";
import { RegisterForm } from "@/components/auth/register-form";

const googleEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-md">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-3xl font-medium text-[#102a43]">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-[#334f6d]">
            Join Baby Secret to track orders and check out faster.
          </p>

          <div className="mt-6">
            <RegisterForm googleEnabled={googleEnabled} />
          </div>
        </div>
      </div>
    </main>
  );
}
