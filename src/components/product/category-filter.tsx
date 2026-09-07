import type { ProductCategory } from "@/types/product";

type CategoryFilterProps = {
  categories: ProductCategory[];
  selected: string;
  onSelect: (slug: string) => void;
};

function pillClasses(isSelected: boolean) {
  return `rounded-full px-3.5 py-1.5 text-xs font-medium transition-all sm:px-5 sm:py-2 sm:text-sm ${
    isSelected
      ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd]"
      : "glass-control text-[#1f3a5f] hover:text-[#005dbd]"
  }`;
}

export function CategoryFilter({
  categories,
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <div className="mb-8 flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={() => onSelect("")}
        className={pillClasses(selected === "")}
      >
        All products
      </button>

      {categories.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.slug)}
          className={pillClasses(selected === item.slug)}
        >
          {item.name}
        </button>
      ))}
    </div>
  );
}
