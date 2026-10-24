import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export const metadata = {
  title: "Shipping & Delivery",
  description: "Waybill, instant delivery, and pickup information for Baby Secret.",
};

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] pt-36">
      <Header />
      <div className="mx-auto max-w-3xl px-6 pb-20 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">Customer information</p>
        <h1 className="mt-4 text-5xl font-medium">Shipping &amp; delivery</h1>
        <div className="glass-panel mt-10 space-y-6 rounded-2xl p-8">
          <section>
            <h2 className="text-2xl font-semibold">Within Lagos</h2>
            <p className="mt-3 leading-7 text-[#334f6d]">
              Choose free pickup from Flawless Plaza, at the back of IMO Plaza,
              International Trade Fair Complex, Lagos, Nigeria, or choose
              instant delivery. Instant delivery charges depend on your location
              and are confirmed separately; the dispatch fee is paid directly
              to the dispatch rider and is not included in the online order total.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Outside Lagos</h2>
            <p className="mt-3 leading-7 text-[#334f6d]">
              Standard waybill shipping costs ₦4,000. Orders above ₦100,000 may
              incur additional fees depending on the size or volume of the goods.
              If extra charges apply, the Baby Secret team will confirm them.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold">Need help?</h2>
            <p className="mt-3 leading-7 text-[#334f6d]">
              Contact Baby Secret before ordering if you need help confirming
              your delivery method or any additional dispatch charges.
            </p>
            <a href="tel:+2347071610793" className="mt-3 inline-flex rounded-full border border-[#005dbd] px-4 py-2 text-sm font-semibold text-[#005dbd]">
              Call (+234) 707-161-0793
            </a>
          </section>
        </div>
      </div>
      <Footer />
    </main>
  );
}
