type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function pageButtonClasses(active: boolean) {
  return `min-w-9 rounded-full px-3 py-1.5 text-xs font-medium transition sm:min-w-10 sm:px-4 sm:py-2 sm:text-sm ${
    active
      ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd] shadow-sm"
      : "glass-control text-[#1f3a5f] hover:text-[#005dbd]"
  }`;
}

function edgeButtonClasses(disabled: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
    disabled
      ? "glass-control pointer-events-none text-[#43617e] opacity-50"
      : "glass-control text-[#1f3a5f] hover:text-[#005dbd]"
  }`;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Product pagination"
      className="mt-12 flex flex-wrap items-center justify-center gap-2"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={edgeButtonClasses(page <= 1)}
      >
        Previous
      </button>

      {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
        const number = index + 1;
        const isCurrent = number === page;
        return (
          <button
            key={number}
            type="button"
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onPageChange(number)}
            className={pageButtonClasses(isCurrent)}
          >
            {number}
          </button>
        );
      })}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={edgeButtonClasses(page >= totalPages)}
      >
        Next
      </button>
    </nav>
  );
}
