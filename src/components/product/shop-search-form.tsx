type ShopSearchFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ShopSearchForm({
  value,
  onChange,
  onSubmit,
}: ShopSearchFormProps) {
  return (
    <form
      className="glass-panel mb-8 flex max-w-xl gap-2 rounded-2xl p-1.5 sm:p-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="shop-search" className="sr-only">
        Search products
      </label>
      <input
        id="shop-search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search products"
        className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm outline-none sm:py-2"
      />
      <button className="rounded-full bg-[#3051a0] px-4 py-1.5 text-xs font-semibold text-white sm:px-5 sm:py-2 sm:text-sm">
        Search
      </button>
    </form>
  );
}
