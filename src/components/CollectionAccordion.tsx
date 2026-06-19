"use client";

import { useState } from "react";
import Link from "next/link";

interface Collection {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  offset: number;
}

const COLLECTIONS: Collection[] = [
  { id: "kanjivaram", title: "Kanjivaram", subtitle: "Timeless Silk", image: "/assets/collection/saree1.jpeg", href: "/shop", offset: 12 },
  { id: "banarasi", title: "Banarasi", subtitle: "Regal Weaves", image: "/assets/collection/saree2.jpeg", href: "/shop", offset: -16 },
  { id: "crape-silk", title: "Crape Silk", subtitle: "Effortless Drape", image: "/assets/collection/saree3.jpeg", href: "/shop", offset: 16 },
  { id: "tussar", title: "Tussar", subtitle: "Earthy Elegance", image: "/assets/collection/saree4.jpeg", href: "/shop", offset: -10 },
  { id: "bridal", title: "Bridal", subtitle: "Wedding Splendour", image: "/assets/collection/saree5.jpeg", href: "/shop", offset: 14 },
  { id: "festive", title: "Festive", subtitle: "Celebration Ready", image: "/assets/collection/saree6.jpeg", href: "/shop", offset: -12 },
];

export default function CollectionAccordion() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeCollection = activeId
    ? COLLECTIONS.find((c) => c.id === activeId) || null
    : null;

  return (
    <section
      id="collections"
      className="relative w-full min-h-screen bg-[#F4F2EC] flex flex-col items-center justify-center py-16 md:py-24 z-10"
    >
      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-6">
        {/* Slice Accordion */}
        <div
          className="hidden md:flex items-center justify-center w-full h-[42vh] lg:h-[48vh] gap-2 lg:gap-3 collection-panels"
          onMouseLeave={() => setActiveId(null)}
        >
          {COLLECTIONS.map((collection) => (
            <Link
              key={collection.id}
              href={collection.href}
              className={`collection-panel relative h-full overflow-hidden rounded-sm cursor-pointer ${
                activeId === collection.id ? "active" : ""
              }`}
              style={{ "--offset": `${collection.offset}px` } as React.CSSProperties}
              onMouseEnter={() => setActiveId(collection.id)}
            >
              <img
                src={collection.image}
                alt={collection.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              />

              {/* Hover overlay title inside the expanded slice */}
              <div className="panel-title absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 mb-2">
                  {collection.subtitle}
                </span>
                <h3 className="text-white text-xl lg:text-2xl font-serif tracking-widest uppercase">
                  {collection.title}
                </h3>
                <span className="mt-4 text-[10px] uppercase tracking-[0.25em] border-b border-white/40 pb-1">
                  Discover
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile: horizontal scroll gallery */}
        <div
          className="flex md:hidden gap-4 overflow-x-auto pb-6 pr-6 pl-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#D7D1C4 transparent" }}
        >
          {COLLECTIONS.map((collection) => (
            <Link
              key={collection.id}
              href={collection.href}
              className="group relative flex-shrink-0 w-[260px] aspect-[3/4] snap-start overflow-hidden rounded-sm bg-[#E0DCD0]"
            >
              <img
                src={collection.image}
                alt={collection.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-0 left-0 w-full p-5">
                <span className="text-white/70 text-xs uppercase tracking-[0.2em] mb-1 block">
                  {collection.subtitle}
                </span>
                <h3 className="text-white text-2xl font-serif tracking-wide">
                  {collection.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Central title below accordion */}
        <div className="text-center mt-10 md:mt-14 transition-opacity duration-300">
          <span className="text-xs uppercase tracking-[0.3em] text-[#8C8776] mb-3 block">
            Curated Selection
          </span>
          <h2 className="text-3xl md:text-5xl font-serif text-[#1A1A1A] mb-3">
            {activeCollection ? activeCollection.title : "Explore Our Sarees"}
          </h2>
          <p className="text-[#5C584E] text-sm md:text-base tracking-wide max-w-md mx-auto">
            {activeCollection
              ? activeCollection.subtitle
              : "Hover over a collection to discover our handwoven luxury sarees."}
          </p>
        </div>
      </div>
    </section>
  );
}
