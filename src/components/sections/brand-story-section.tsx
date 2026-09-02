import Image from "next/image";

const brandStoryImage = "/brand-story.png";

export function BrandStorySection() {
  return (
    <section className="relative min-h-[620px] overflow-hidden bg-[#343434] sm:min-h-[760px]">
      <Image
        src={brandStoryImage}
        alt="A child surrounded by Baby Secret products"
        fill
        className="object-cover"
        unoptimized
      />
      <div className="absolute inset-0 bg-black/15" />

      <div className="relative z-[1] mx-auto flex min-h-[620px] max-w-[1200px] items-center px-6 py-20 sm:min-h-[760px] sm:px-10 lg:px-0">
        <div className="max-w-[576px] text-white">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/70">
            Brand Story
          </p>
          <h2 className="mt-4 text-5xl font-medium leading-none sm:text-6xl">
            The little things are everything.
          </h2>
          <ul className="mt-7 space-y-2 text-lg font-light text-white/85">
            <li>The tiny hands.</li>
            <li>The sleepy smiles.</li>
            <li>The bath-time splashes.</li>
            <li>The smell after a fresh bath.</li>
            <li>The cuddles before bedtime.</li>
          </ul>
          <p className="mt-8 text-base text-white/75 sm:text-lg">
            These are the moments we make Baby Secret for.
          </p>
          <p className="mt-4 text-2xl font-medium italic text-white sm:text-3xl">
            Because growing up happens once.
          </p>
        </div>
      </div>
    </section>
  );
}