"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { handleImageError } from "@/lib/images";

const COLLECTIONS = [
  { id: "kanjivaram", title: "Kanjivaram", subtitle: "Timeless Silk", image: "/assets/collection/saree1.jpeg", href: "/shop" },
  { id: "banarasi", title: "Banarasi", subtitle: "Regal Weaves", image: "/assets/collection/saree2.jpeg", href: "/shop" },
  { id: "crape-silk", title: "Crape Silk", subtitle: "Effortless Drape", image: "/assets/collection/saree3.jpeg", href: "/shop" },
  { id: "tussar", title: "Tussar", subtitle: "Earthy Elegance", image: "/assets/collection/saree4.jpeg", href: "/shop" },
  { id: "bridal", title: "Bridal", subtitle: "Wedding Splendour", image: "/assets/collection/saree5.jpeg", href: "/shop" },
  { id: "festive", title: "Festive", subtitle: "Celebration Ready", image: "/assets/collection/saree6.jpeg", href: "/shop" },
];

export default function CollectionGallery() {
  return (
    <section id="collections" className="relative w-full bg-[#F4F2EC] py-16 md:py-24 z-10">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10 md:mb-14">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-[#8C8776] mb-3 block">
              Curated Selection
            </span>
            <h2 className="text-3xl md:text-5xl font-serif text-[#1A1A1A]">
              Explore Our Sarees
            </h2>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-[#5C584E] hover:text-[#1A1A1A] transition-colors group"
          >
            View All
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="pl-6 md:pl-12">
        <div
          className="flex gap-4 md:gap-6 overflow-x-auto pb-6 pr-6 md:pr-12 snap-x snap-mandatory"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#D7D1C4 transparent" }}
        >
          {COLLECTIONS.map((collection) => (
            <Link
              key={collection.id}
              href={collection.href}
              className="group relative flex-shrink-0 w-[260px] md:w-[340px] lg:w-[400px] aspect-[3/4] snap-start overflow-hidden rounded-sm bg-[#E0DCD0]"
            >
              <img
                src={collection.image}
                alt={collection.title}
                loading="lazy"
                onError={handleImageError}
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <div className="absolute bottom-0 left-0 w-full p-5 md:p-7">
                <span className="text-white/70 text-xs uppercase tracking-[0.2em] mb-1 block">
                  {collection.subtitle}
                </span>
                <h3 className="text-white text-2xl md:text-3xl font-serif tracking-wide">
                  {collection.title}
                </h3>
                <span className="inline-flex items-center gap-2 mt-4 text-white text-xs uppercase tracking-widest border-b border-white/40 pb-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  Discover
                  <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
