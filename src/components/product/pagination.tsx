type PaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function pageButtonClasses(active: boolean) {
  return `min-w-10 rounded-full px-4 py-2 text-sm font-medium transition ${
    active
      ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd] shadow-sm"
      : "border border-[#d6e0f0] bg-white text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
  }`;
}

function edgeButtonClasses(disabled: boolean) {
  return `rounded-full px-4 py-2 text-sm font-medium transition ${
    disabled
      ? "pointer-events-none opacity-40 border border-[#d6e0f0] bg-white text-[#62809e]"
      : "border border-[#d6e0f0] bg-white text-[#102a43] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
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
