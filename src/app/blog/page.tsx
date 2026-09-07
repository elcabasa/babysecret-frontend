import { Header } from "@/components/layout/header";
export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">
          Secret Keeper
        </p>
        <h1 className="mt-4 text-5xl font-medium">Baby care guide</h1>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            "Bath time made gentle",
            "Building a simple routine",
            "Care for delicate skin",
          ].map((title) => (
            <article key={title} className="glass-panel rounded-2xl p-6">
              <p className="text-xs text-[#3051a0]">Care guide</p>
              <h2 className="mt-12 text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm text-[#334f6d]">
                Helpful ideas for everyday family routines.
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
