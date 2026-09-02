const statusStyles: Record<string, { label: string; className: string }> = {
  processing: { label: "Processing", className: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Completed", className: "bg-green-50 text-green-700 border-green-200" },
  "on-hold": { label: "On Hold", className: "bg-slate-100 text-slate-700 border-slate-200" },
  pending: { label: "Pending Payment", className: "bg-slate-100 text-slate-700 border-slate-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 border-red-200" },
  refunded: { label: "Refunded", className: "bg-red-50 text-red-700 border-red-200" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700 border-red-200" },
};

export function OrderStatusPill({ status }: { status: string }) {
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