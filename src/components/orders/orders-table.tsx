import { OrderRow } from "@/components/orders/order-row";
import type { CustomerOrder } from "@/lib/woocommerce-orders";

export function OrdersTable({ orders }: { orders: CustomerOrder[] }) {
  return (
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
  );
}