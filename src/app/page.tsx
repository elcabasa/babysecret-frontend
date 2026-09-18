import { BenefitsSection } from "@/components/sections/benefits-section";
import { BrandStorySection } from "@/components/sections/brand-story-section";
import { FeaturedProductsSection } from "@/components/sections/featured-products-section";
import { HeroSection } from "@/components/sections/hero-section";
import { RoutineSection } from "@/components/sections/routine-section";
import { Footer } from "@/components/layout/footer";
import { AuthToast } from "@/components/auth/auth-toast";
import { getFeaturedProducts } from "@/services/product.service";

export default async function Home() {
  const featuredProducts = await getFeaturedProducts();

  return (
    <main className="min-h-screen bg-white text-[#010408]">
      <AuthToast />

      <HeroSection />

      <BenefitsSection />

      <FeaturedProductsSection products={featuredProducts} />

      <RoutineSection />

      <BrandStorySection />

      <Footer />
    </main>
  );
}
