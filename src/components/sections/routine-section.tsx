"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

const routines = {
  "Newborn essentials": [
    ["01 Cleanse", "Amino Baby Shower Gel", "₦4,000"],
    ["02 Nourish", "Baby Massage Oil", "₦4,800"],
    ["03 Cuddle", "Ready for the day", ""],
  ],
  "Bath time": [
    ["01 Cleanse", "Babysecret Bath 500ml", "₦4,500"],
    ["02 Nourish", "Babysecret Lotion 200ml", "₦3,000"],
    ["03 Cuddle", "Ready for the day", ""],
  ],
  "Dry skin": [
    ["01 Cleanse", "Gentle Baby Soap", "₦1,500"],
    ["02 Nourish", "Babysecret Lotion 400ml", "₦6,000"],
    ["03 Cuddle", "Ready for the day", ""],
  ],
  "Everyday moisturising": [
    ["01 Cleanse", "Babysecret Bath 500ml", "₦4,500"],
    ["02 Nourish", "Babysecret Oil 120ml", "₦2,500"],
    ["03 Cuddle", "Ready for the day", ""],
  ],
  "Baby massage": [
    ["01 Cleanse", "Amino Baby Shower Gel", "₦4,000"],
    ["02 Nourish", "Baby Massage Oil", "₦4,800"],
    ["03 Cuddle", "Ready for the day", ""],
  ],
  "Complete routine": [
    ["01 Cleanse", "Amino Baby Shower Gel", "₦4,000"],
    ["02 Nourish", "Baby Massage Oil", "₦4,800"],
    ["03 Cuddle", "Ready for the day", ""],
  ],
} as const;

type RoutineName = keyof typeof routines;

export function RoutineSection() {
  const [selected, setSelected] = useState<RoutineName>("Baby massage");
  return (
    <section className="bg-[#f9fcff] px-6 py-24 sm:px-10">
      <div className="mx-auto max-w-[896px] text-center">
        <h2 className="text-4xl font-medium">
          Build your baby&apos;s routine.
        </h2>
        <p className="mt-2 text-sm text-[#334f6d]">
          What are you shopping for?
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {Object.keys(routines).map((name) => (
            <button
              key={name}
              onClick={() => setSelected(name as RoutineName)}
              className={`rounded-full border px-4 py-2 text-xs transition ${selected === name ? "border-[#005dbd] bg-[#005dbd] text-white" : "border-[#e5e3e3] bg-white text-[#334f6d] hover:border-[#005dbd]"}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="mt-9 rounded-xl border border-[#e5e3e3] bg-white p-7 text-left sm:p-10">
          <h3 className="text-center text-2xl font-medium">
            Your {selected} Routine
          </h3>
          <div className="mt-7">
            {routines[selected].map(([step, name, price]) => (
              <div
                key={step}
                className="grid grid-cols-[90px_1fr_auto] gap-3 border-b border-[#efebe2] py-5 text-sm"
              >
                <span className="text-xs text-[#3051a0]">{step}</span>
                <strong>{name}</strong>
                <span className="text-[#334f6d]">{price}</span>
              </div>
            ))}
          </div>
          <div className="mt-7 flex items-center justify-between">
            <strong>Total</strong>
            <strong className="text-lg">
              {selected === "Baby massage" ||
              selected === "Newborn essentials" ||
              selected === "Complete routine"
                ? "₦8,800"
                : "₦7,500"}
            </strong>
          </div>
          <div className="mt-7 text-center">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#005dbd] px-8 py-3 text-sm font-semibold text-white">
              Shop This Routine <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
