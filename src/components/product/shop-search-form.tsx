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
      className="glass-panel mb-8 flex max-w-xl gap-2 rounded-2xl p-2"
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
        className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
      />
      <button className="rounded-full bg-[#3051a0] px-5 py-2 text-sm font-semibold text-white">
        Search
      </button>
    </form>
  );
}
