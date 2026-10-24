import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
const faqs = [
  [
    "How do I place an order?",
    "Browse the catalog, add products to your cart, and continue to checkout. Payment is not configured in this environment yet.",
  ],
  [
    "Are the products suitable for babies and children?",
    "Baby Secret presents its range as care for babies and children with delicate skin. Review each product description and contact the team if you need help choosing.",
  ],
  [
    "Where is stock managed?",
    "Product availability is managed by the Baby Secret team through WooCommerce.",
  ],
  [
    "How can I contact the team?",
    "Call (+234) 703-000-3057 or email hello@babysecret.com.",
  ],
  [
    "How does delivery work?",
    "Delivery areas, pricing, and timelines are awaiting final business confirmation. Contact the team for current guidance.",
  ],
  [
    "What should I do if I have an issue with my order?",
    "Contact the Baby Secret team with your order reference and a description of the issue so they can advise on the next step.",
  ],
];
export const metadata = {
  title: "FAQs",
  description:
    "Frequently asked questions about Baby Secret products and shopping.",
};
export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#f9fcff] pt-36">
      <Header />
      <div className="mx-auto max-w-3xl px-6 pb-20 sm:px-10">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">
          Help centre
        </p>
        <h1 className="mt-4 text-5xl font-medium">FAQs</h1>
        <div className="mt-10 grid gap-4">
          {faqs.map(([q, a]) => (
            <details key={q} className="glass-panel rounded-2xl p-6">
              <summary className="cursor-pointer font-semibold focus-visible:outline-2 focus-visible:outline-[#3051a0]">
                {q}
              </summary>
              <p className="mt-4 text-[#334f6d]">{a}</p>
            </details>
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}
