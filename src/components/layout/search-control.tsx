"use client";

import { Search, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SearchControl() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} className="grid size-10 place-items-center rounded-full bg-white shadow-sm" aria-label={open ? "Close search" : "Open search"} aria-expanded={open}><Search size={18} className="text-[#3051a0]" /></button>
    {open && <form onSubmit={submit} className="glass-panel absolute right-0 top-12 z-30 flex w-[min(86vw,360px)] items-center gap-2 rounded-2xl p-2"><Search size={17} className="ml-2 shrink-0 text-[#3051a0]" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search baby care" aria-label="Search products" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none" /><button type="submit" disabled={!query.trim()} className="rounded-full bg-[#3051a0] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Search</button><button type="button" onClick={() => setOpen(false)} aria-label="Close search" className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/70"><X size={16} /></button></form>}
  </div>;
}
