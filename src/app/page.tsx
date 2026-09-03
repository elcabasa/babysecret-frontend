import { BenefitsSection } from "@/components/sections/benefits-section";
import { BrandStorySection } from "@/components/sections/brand-story-section";
import { FeaturedProductsSection } from "@/components/sections/featured-products-section";
import { HeroSection } from "@/components/sections/hero-section";
import { RoutineSection } from "@/components/sections/routine-section";
import { Footer } from "@/components/layout/footer";
import { getFeaturedProducts } from "@/services/product.service";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ auth_success?: string }>;
}) {
  const featuredProducts = await getFeaturedProducts();
  const { auth_success } = (await searchParams) ?? {};

  return (
    <main className="min-h-screen bg-white text-[#010408]">
      <HeroSection authSuccess={auth_success} />

      <BenefitsSection />

      <FeaturedProductsSection products={featuredProducts} />

      <RoutineSection />

      <BrandStorySection />

      <Footer />
    </main>
  );
}
