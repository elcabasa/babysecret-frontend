import { Baby, Heart, Sparkles, Sprout } from "lucide-react";

const benefits = [
  {
    title: "Gentle on delicate skin",
    text: "Everyday care designed with your little one's skin in mind.",
    icon: Heart,
  },
  {
    title: "Made with care",
    text: "Thoughtfully developed products for everyday family routines.",
    icon: Sparkles,
  },
  {
    title: "From baby to growing years",
    text: "Care that grows with your child.",
    icon: Sprout,
  },
  {
    title: "Loved by families",
    text: "Products made for the moments parents cherish.",
    icon: Baby,
  },
];

export function BenefitsSection() {
  return (
    <>
      {/* Mobile: Figma 2-column value prop cards */}
      <section className="bg-white px-4 py-10 md:hidden">
        <div className="mx-auto max-w-[358px]">
          <h2 className="text-center text-2xl font-bold leading-[30px] tracking-[-0.24px] text-[#142F54]">
            Made for little moments.
          </h2>
          <p className="mt-2 text-center text-[12px] leading-[18px] text-[#424753]">
            Thoughtfully created with maternal love and pediatric care
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {benefits.map(({ title, text, icon: Icon }) => (
              <div
                key={title}
                className="flex flex-col items-center rounded-2xl glass-panel px-4 py-4 text-center"
              >
                <div className="grid size-12 place-items-center rounded-full bg-[#D8E2FF]/60 shadow-sm backdrop-blur-[4px]">
                  <Icon size={22} className="text-[#0055B8]" />
                </div>
                <h3 className="mt-3 text-[15px] font-bold leading-[20.63px] text-[#142F54]">
                  {title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-[18px] text-[#424753]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Desktop: existing benefit cards */}
      <section className="hidden border-b border-[#efebe2]/60 bg-[#f9fcff] px-6 py-16 sm:px-10 md:block">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="text-center text-3xl font-medium">
            Made for little moments.
          </h2>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ title, text, icon: Icon }) => (
              <div key={title} className="text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-xl bg-[#e7effc] text-[#005dbd]">
                  <Icon size={24} />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{title}</h3>
                <p className="mx-auto mt-2 max-w-[220px] text-sm leading-5 text-[#334f6d]">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}