"use client";

import { useRouter } from "next/navigation";

interface SortSelectProps {
  value: string;
}

export function SortSelect({ value }: SortSelectProps) {
  const router = useRouter();

  function handleSortChange(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const sort = event.target.value;

    console.log("Selected sort:", sort);

    if (sort === "featured") {
      router.push("/shop");
    } else {
      router.push(`/shop?sort=${sort}`);
    }
  }

  return (
    <div className="glass-control flex items-center gap-2 rounded-full px-4 py-2 text-sm">
      <label htmlFor="sort">Sort by</label>

      <select
        id="sort"
        value={value}
        onChange={handleSortChange}
        className="bg-transparent font-medium outline-none"
      >
        <option value="featured">Featured</option>
        <option value="price-asc">
          Price: Low to High
        </option>
        <option value="price-desc">
          Price: High to Low
        </option>
      </select>
    </div>
  );
}