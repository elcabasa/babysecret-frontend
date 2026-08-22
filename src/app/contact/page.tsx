import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactForm } from "@/components/forms/contact-form";
import { siteConfig } from "@/data/site";
export const metadata = { title: "Contact Us", description: "Contact Baby Secret by phone, email, or message." };
export default function ContactPage() { return <main className="min-h-screen bg-[#f9fcff] pt-36"><Header /><div className="mx-auto max-w-3xl px-6 pb-20 sm:px-10"><p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">Get in touch</p><h1 className="mt-4 text-5xl font-medium">We&apos;re here to help.</h1><p className="mt-4 text-[#334f6d]">Questions about products, orders, or finding the right routine? Send us a message.</p><div className="mt-8 flex flex-wrap gap-3"><a href={`tel:${siteConfig.phone}`} className="glass-control rounded-full px-4 py-2 text-sm">Call {siteConfig.displayPhone}</a><a href={`mailto:${siteConfig.email}`} className="glass-control rounded-full px-4 py-2 text-sm">Email {siteConfig.email}</a></div><ContactForm /></div><Footer /></main>; }
