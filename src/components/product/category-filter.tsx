import type { ProductCategory } from "@/types/product";

type CategoryFilterProps = {
  categories: ProductCategory[];
  selected: string;
  onSelect: (slug: string) => void;
};

function pillClasses(isSelected: boolean) {
  return `rounded-full px-5 py-2 text-sm font-medium transition-all shadow-xs ${
    isSelected
      ? "bg-[#005dbd] text-white font-semibold border border-[#005dbd]"
      : "bg-white text-[#102a43] border border-[#d6e0f0] hover:border-[#005dbd] hover:text-[#005dbd] hover:bg-[#f3f7ff]"
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
