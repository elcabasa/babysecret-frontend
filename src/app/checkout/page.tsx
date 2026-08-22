import { Header } from "@/components/layout/header";
import { CheckoutSummary } from "@/components/cart/checkout-summary";
import { CheckoutForm } from "@/components/forms/checkout-form";

export default function CheckoutPage() { return <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10"><Header /><div className="mx-auto max-w-[1100px]"><p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">Secure checkout</p><h1 className="mt-4 text-5xl font-medium">Checkout</h1><div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><CheckoutForm /><CheckoutSummary /></div></div></main>; }
