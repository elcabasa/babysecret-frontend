import Image from "next/image";
import { Baby, Droplets, Flower2, Heart, Moon } from "lucide-react";

const brandStoryImage = "/brand-story.png";

const stories = [
  { text: "The tiny hands.", icon: Baby },
  { text: "The sleepy smiles.", icon: Moon },
  { text: "The bath-time splashes.", icon: Droplets },
  { text: "The smell after a fresh bath.", icon: Flower2 },
  { text: "The cuddles before bedtime.", icon: Heart },
];

export function BrandStorySection() {
  return (
    <>
      {/* Mobile: Figma brand story */}
      <section className="relative overflow-hidden bg-[#142F54] md:hidden">
        <Image
          src={brandStoryImage}
          alt="A child surrounded by Baby Secret products"
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/45 to-black/60" />
        <div className="absolute -left-24 top-1/3 size-64 rounded-full bg-[#0055B8]/30 blur-3xl" />
        <div className="absolute -right-20 bottom-20 size-64 rounded-full bg-[#0055B8]/40 blur-3xl" />

        <div className="relative z-[1] px-4 py-16">
          <div className="mx-auto max-w-[358px]">
            <span className="inline-flex h-6 w-[140px] items-center justify-center rounded-full glass-badge font-secondary text-[11px] font-bold uppercase tracking-[1.1px] text-white">
              Brand Story
            </span>
            <h2 className="mt-4 text-[26px] font-bold leading-[35.75px] tracking-[-0.65px] text-white">
              The little things are everything.
            </h2>

            <div className="mt-6 flex flex-col gap-2.5">
              {stories.map(({ text, icon: Icon }) => (
                <div
                  key={text}
                  className="flex h-[62px] items-center gap-3 rounded-xl glass-dark-light p-[13px]"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#0055B8]/80 text-white backdrop-blur-[4px]">
                    <Icon size={16} />
                  </span>
                  <span className="text-[16px] font-bold leading-[26px] text-white">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            <div className="relative mt-5 rounded-2xl glass-dark p-[17px] shadow-[0_20px_48px_rgba(0,0,0,0.35)]">
              <p className="text-sm font-semibold leading-[22.75px] text-white">
                These are the moments we make Baby Secret for.
              </p>
              <p className="mt-3 text-[18px] font-bold italic leading-6 tracking-[0.45px] text-[#D6E3FF]">
                Because growing up happens once.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Desktop: existing brand story */}
      <section className="relative hidden min-h-[620px] overflow-hidden bg-[#343434] sm:min-h-[760px] md:block">
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
    </>
  );
}