import { OrderStatusPill } from "@/components/orders/order-status-pill";
import { formatPrice } from "@/data/products";
import type { CustomerOrder } from "@/lib/woocommerce-orders";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function OrderRow({ order }: { order: CustomerOrder }) {
  return (
    <div className="grid grid-cols-2 items-center gap-y-3 border-b border-[#e6edf7] px-5 py-4 text-sm sm:grid-cols-[1fr_1fr_1fr_1fr] sm:gap-y-0">
      <div className="font-semibold text-[#102a43]">#{order.number}</div>
      <div className="text-right text-[#62809e] sm:text-left">
        {formatDate(order.date_created)}
      </div>
      <div className="col-span-2 sm:col-span-1">
        <OrderStatusPill status={order.status} />
      </div>
      <div className="col-span-2 text-right font-semibold text-[#102a43] sm:col-span-1">
        {formatPrice(Number(order.total))}
      </div>
    </div>
  );
}
