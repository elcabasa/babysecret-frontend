import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { businessContent } from "@/data/site";
export const metadata = { title: "Shipping & Delivery", description: "Shipping and delivery information for Baby Secret." };
export default function ShippingPage() { return <main className="min-h-screen bg-[#f9fcff] pt-36"><Header /><div className="mx-auto max-w-3xl px-6 pb-20 sm:px-10"><p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">Customer information</p><h1 className="mt-4 text-5xl font-medium">Shipping &amp; delivery</h1><div className="glass-panel mt-10 rounded-2xl p-8"><h2 className="text-2xl font-semibold">Policy details are being finalized</h2><p className="mt-4 leading-7 text-[#334f6d]">{businessContent.policies.shippingStatus}</p><p className="mt-4 leading-7 text-[#334f6d]">Please contact the Baby Secret team before ordering if you need delivery guidance.</p></div></div><Footer /></main>; }
