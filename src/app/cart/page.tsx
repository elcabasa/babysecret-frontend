import { Header } from "@/components/layout/header";
import { CartPageContent } from "@/components/cart/cart-page-content";

export default function CartPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />
      <div className="mx-auto max-w-[1100px]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">
          Your basket
        </p>
        <h1 className="mt-4 text-5xl font-medium">Cart</h1>
        <div className="mt-10">
          <CartPageContent />
        </div>
      </div>
    </main>
  );
}
