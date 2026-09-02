export default function ShopLoading() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="h-4 w-24 animate-pulse rounded bg-[#dbe8f7]" />
        <div className="mt-4 h-14 w-3/4 animate-pulse rounded bg-[#dbe8f7]" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="h-96 animate-pulse rounded-2xl bg-white shadow-sm"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
