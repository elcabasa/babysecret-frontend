"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { useCartStore } from "@/store/cart.store";

const routineDefinitions = {
  "Newborn essentials": [
    { step: "01 Cleanse", pattern: /bath|shower|soap|cleanser/i },
    { step: "02 Nourish", pattern: /lotion|moisturi[sz]er|cream/i },
    { step: "03 Care", pattern: /oil|wipes/i },
  ],
  "Bath time": [
    { step: "01 Cleanse", pattern: /bath|shower|soap|cleanser/i },
    { step: "02 Moisturise", pattern: /lotion|moisturi[sz]er|cream/i },
  ],
  "Dry skin": [
    { step: "01 Moisturise", pattern: /lotion|moisturi[sz]er|cream/i },
    { step: "02 Nourish", pattern: /oil/i },
  ],
  "Everyday moisturising": [
    { step: "01 Moisturise", pattern: /lotion|moisturi[sz]er|cream/i },
    { step: "02 Nourish", pattern: /oil/i },
  ],
  "Baby massage": [
    { step: "01 Cleanse", pattern: /bath|shower|soap|cleanser/i },
    { step: "02 Massage", pattern: /massage oil|baby oil|oil/i },
  ],
  "Complete routine": [
    { step: "01 Cleanse", pattern: /bath|shower|soap|cleanser/i },
    { step: "02 Moisturise", pattern: /lotion|moisturi[sz]er|cream/i },
    { step: "03 Nourish", pattern: /oil/i },
  ],
} as const;

type RoutineName = keyof typeof routineDefinitions;

const routineNames = Object.keys(routineDefinitions) as RoutineName[];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(price);
}

export function RoutineSection() {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [selected, setSelected] = useState<RoutineName>("Baby massage");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/routines");
        if (!response.ok) {
          throw new Error("Routine products could not be loaded.");
        }

        const data = (await response.json()) as { products?: Product[] };
        if (!Array.isArray(data.products)) {
          throw new Error("The product response was invalid.");
        }

        if (active) {
          setProducts(data.products);
          setLoadError("");
        }
      } catch {
        if (active) {
          setLoadError(
            "We couldn't load the latest products and prices. Please try again shortly.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  const routineProducts = useMemo(() => {
    const used = new Set<string>();
    const availableProducts = products.filter(
      (product) =>
        product.stockStatus !== "out-of-stock" &&
        product.purchasable !== false &&
        Number.isFinite(product.price) &&
        product.price >= 0,
    );

    return routineDefinitions[selected].flatMap(({ step, pattern }) => {
      const product = availableProducts.find(
        (candidate) =>
          !used.has(candidate.id) && pattern.test(candidate.name),
      );
      if (!product) return [];
      used.add(product.id);
      return [{ step, product }];
    });
  }, [products, selected]);

  const total = routineProducts.reduce(
    (sum, item) => sum + item.product.price,
    0,
  );

  function handleShipRoutine() {
    if (adding || routineProducts.length === 0) return;

    setAdding(true);
    for (const { product } of routineProducts) {
      addItem({
        productId: product.id,
        slug: product.slug ?? product.id,
        name: product.name,
        image: product.image,
        price: product.price,
        stockStatus: product.stockStatus,
      });
    }
    router.push("/cart");
  }

  const routinePanel = (compact: boolean) => (
    <div
      className={
        compact
          ? "mt-6 rounded-xl glass-panel p-5 text-left shadow-[0_2px_12px_rgba(20,47,84,0.06)]"
          : "mt-9 rounded-xl border border-[#e5e3e3] bg-white p-7 text-left sm:p-10"
      }
    >
      <h3
        className={
          compact
            ? "text-center text-xl font-bold text-[#142F54]"
            : "text-center text-2xl font-medium"
        }
      >
        Your {selected} Routine
      </h3>

      <div className={compact ? "mt-5" : "mt-7"}>
        {loading ? (
          <p className="py-5 text-center text-sm text-[#424753]" role="status">
            Loading current products and prices…
          </p>
        ) : loadError ? (
          <p className="py-5 text-center text-sm text-red-700" role="alert">
            {loadError}
          </p>
        ) : routineProducts.length === 0 ? (
          <p className="py-5 text-center text-sm text-[#424753]">
            No matching in-stock products are available for this routine right now.
          </p>
        ) : (
          routineProducts.map(({ step, product }) => (
            <div
              key={`${step}-${product.id}`}
              className={
                compact
                  ? "grid grid-cols-[70px_1fr_auto] items-center gap-3 border-b border-[#efebe2] py-4 text-sm"
                  : "grid grid-cols-[90px_1fr_auto] items-center gap-3 border-b border-[#efebe2] py-5 text-sm"
              }
            >
              <span className="text-xs font-semibold text-[#3051a0]">
                {step}
              </span>
              <strong className="text-[#142F54]">{product.name}</strong>
              <span className="whitespace-nowrap text-[#424753]">
                {formatPrice(product.price)}
              </span>
            </div>
          ))
        )}
      </div>

      <div
        className={
          compact
            ? "mt-5 flex items-center justify-between"
            : "mt-7 flex items-center justify-between"
        }
      >
        <strong className="text-[#142F54]">Total</strong>
        <strong className="text-lg text-[#142F54]">{formatPrice(total)}</strong>
      </div>

      <div className={compact ? "mt-5 text-center" : "mt-7 text-center"}>
        <button
          type="button"
          onClick={handleShipRoutine}
          disabled={loading || Boolean(loadError) || routineProducts.length === 0 || adding}
          className={
            compact
              ? "inline-flex items-center justify-center gap-2 rounded-full bg-[#0055B8] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#004a9f] disabled:cursor-not-allowed disabled:opacity-50"
              : "inline-flex items-center justify-center gap-2 rounded-full bg-[#005dbd] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#004d9c] disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {adding ? "Adding to cart…" : "Ship This Routine"}
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <section className="bg-white px-4 py-10 md:hidden">
        <div className="mx-auto max-w-[358px] text-center">
          <p className="font-secondary text-[11px] font-semibold uppercase leading-[14px] tracking-[0.55px] text-[#0055B8]">
            Routine builder
          </p>
          <h2 className="mt-2 text-2xl font-bold leading-[30px] tracking-[-0.24px] text-[#142F54]">
            Build your baby&apos;s routine.
          </h2>
          <p className="mt-2 text-[12px] leading-[18px] text-[#424753]">
            What are you shopping for?
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {routineNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                aria-pressed={selected === name}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  selected === name
                    ? "bg-[#0055B8] text-white"
                    : "border border-[#E5E3E3] bg-white text-[#424753] hover:border-[#0055B8]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {routinePanel(true)}
        </div>
      </section>

      <section className="hidden bg-[#f9fcff] px-6 py-24 sm:px-10 md:block">
        <div className="mx-auto max-w-[896px] text-center">
          <h2 className="text-4xl font-medium">
            Build your baby&apos;s routine.
          </h2>
          <p className="mt-2 text-sm text-[#334f6d]">
            What are you shopping for?
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {routineNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setSelected(name)}
                aria-pressed={selected === name}
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  selected === name
                    ? "border-[#005dbd] bg-[#005dbd] text-white"
                    : "border-[#e5e3e3] bg-white text-[#334f6d] hover:border-[#005dbd]"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          {routinePanel(false)}
        </div>
      </section>
    </>
  );
}
