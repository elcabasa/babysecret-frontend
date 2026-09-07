type ProductEmptyStateProps = {
  onClear: () => void;
};

export function ProductEmptyState({ onClear }: ProductEmptyStateProps) {
  return (
    <div className="glass-panel rounded-2xl p-8">
      <h2 className="text-xl font-semibold text-[#102a43]">
        No products found
      </h2>
      <p className="mt-2 text-[#334f6d]">
        Try another search or browse a category.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 inline-block font-semibold text-[#005dbd] hover:underline"
      >
        Clear filters
      </button>
    </div>
  );
}
