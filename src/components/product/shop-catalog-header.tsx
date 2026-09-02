type ShopCatalogHeaderProps = {
  totalProducts: number;
  sort: string;
  onSortChange: (sort: string) => void;
};

export function ShopCatalogHeader({
  totalProducts,
  sort,
  onSortChange,
}: ShopCatalogHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#3051a0]">
          Catalog
        </p>
        <h1 className="mt-3 text-5xl font-medium">Everyday care, made simple.</h1>
        <p className="mt-3 max-w-xl text-[#334f6d]">
          {totalProducts} Baby Secret essentials for bath time, moisturising,
          massage, and gentle clean-ups.
        </p>
      </div>

      <div className="glass-control flex items-center gap-2 rounded-full px-4 py-2 text-sm">
        <label htmlFor="sort">Sort by</label>
        <select
          id="sort"
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          className="bg-transparent font-medium outline-none"
        >
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>
      </div>
    </div>
  );
}