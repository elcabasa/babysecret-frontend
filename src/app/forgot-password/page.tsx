import { Header } from "@/components/layout/header";
import { ForgotPasswordForm } from "@/components/auth/forgot-form";

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-md">
        <div className="glass-panel rounded-2xl p-8">
          <h1 className="text-3xl font-medium text-[#102a43]">
            Reset your password
          </h1>
          <p className="mt-2 text-sm text-[#334f6d]">
            Enter your email and we will send you a reset link.
          </p>

          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </main>
  );
}
