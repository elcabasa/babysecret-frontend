import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { Header } from "@/components/layout/header";
import { OrdersEmptyState } from "@/components/orders/orders-empty-state";
import { OrdersErrorState } from "@/components/orders/orders-error-state";
import { OrdersTable } from "@/components/orders/orders-table";
import { auth } from "@/auth";
import {
  getCustomerOrders,
  type CustomerOrder,
} from "@/lib/woocommerce-orders";

export const metadata: Metadata = {
  title: "My Orders",
  description: "View your Baby Secret order history.",
};

export default async function OrdersPage() {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    redirect("/login");
  }

  let orders: CustomerOrder[] | null = null;
  let error: string | null = null;

  try {
    // The customer id comes from the authenticated server-side session — never
    // from the browser — so a user can only ever fetch their own orders.
    orders = await getCustomerOrders(session.user.id);
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
            <OrdersErrorState message={error} />
          ) : orders && orders.length > 0 ? (
            <OrdersTable orders={orders} />
          ) : (
            <OrdersEmptyState />
          )}
        </div>
      </div>
    </main>
  );
}