import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Package } from "lucide-react";

import { Header } from "@/components/layout/header";
import { auth } from "@/auth";
import { formatPrice } from "@/data/products";
import {
  getCustomerOrders,
  type CustomerOrder,
} from "@/lib/woocommerce-orders";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View your Baby Secret order history.",
};

const statusStyles: Record<string, { label: string; className: string }> = {
  processing: { label: "Processing", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  "on-hold": { label: "On Hold", className: "bg-slate-100 text-slate-700 border-slate-200" },
  pending: { label: "Pending Payment", className: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  refunded: { label: "Refunded", className: "bg-red-50 text-red-700 border-red-200" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" },
};

function statusPill(status: string) {
  const entry =
    statusStyles[status] ??
    {
      label: status
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      className: "bg-slate-100 text-slate-700 border-slate-200",
    };
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${entry.className}`}>
      {entry.label}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OrderRow({ order }: { order: CustomerOrder }) {
  return (
    <div className="grid grid-cols-2 items-center gap-y-3 border-b border-[#e6edf7] px-5 py-4 text-sm sm:grid-cols-[1fr_1fr_1fr_1fr] sm:gap-y-0">
      <div className="font-semibold text-[#102a43]">#{order.number}</div>
      <div className="text-right text-[#62809e] sm:text-left">{formatDate(order.date_created)}</div>
      <div className="col-span-2 sm:col-span-1">{statusPill(order.status)}</div>
      <div className="col-span-2 text-right font-semibold text-[#102a43] sm:col-span-1">
        {formatPrice(Number(order.total))}
      </div>
    </div>
  );
}

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  let orders: CustomerOrder[] | null = null;
  let error: string | null = null;

  try {
    orders = await getCustomerOrders(session.user.email);
  } catch {
    error = "We could not load your orders right now. Please try again later.";
  }

  return (
    <main className="min-h-screen bg-[#f9fcff] px-6 pb-20 pt-36 sm:px-10">
      <Header />

      <div className="mx-auto max-w-[1100px]">
        <p className="text-xs font-bold uppercase tracking-wide text-[#3051a0]">
          Your account
        </p>
        <h1 className="mt-4 text-4xl font-medium tracking-tight text-[#102a43] sm:text-5xl">
          My Orders
        </h1>
        <p className="mt-3 text-[#334f6d]">
          A record of every order placed with {session.user.email}.
        </p>

        <div className="mt-10">
          {error ? (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <p className="text-[#334f6d]">{error}</p>
              <Link
                href="/shop"
                className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white transition hover:bg-[#004d9c]"
              >
                Continue Shopping
              </Link>
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="glass-panel overflow-hidden rounded-2xl">
              <div className="grid grid-cols-2 items-center gap-y-3 border-b border-[#e6edf7] px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-[#62809e] sm:grid-cols-[1fr_1fr_1fr_1fr] sm:gap-y-0">
                <span>Order ID</span>
                <span className="text-right sm:text-left">Date</span>
                <span className="col-span-2 sm:col-span-1">Status</span>
                <span className="col-span-2 text-right sm:col-span-1">Total</span>
              </div>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-10 text-center">
              <Package className="mx-auto text-[#3051a0]" size={36} />
              <h2 className="mt-4 text-xl font-semibold text-[#102a43]">
                You haven&apos;t placed any orders yet.
              </h2>
              <p className="mt-2 text-[#334f6d]">
                Explore our baby care range and your order history will appear
                here.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block rounded-full bg-[#005dbd] px-7 py-3 font-semibold text-white transition hover:bg-[#004d9c]"
              >
                Shop Now
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}