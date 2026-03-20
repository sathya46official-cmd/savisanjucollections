import HeroCanvas from "@/components/HeroCanvas";
import SmoothFadeTransition from "@/components/TornPaperDivider";
import CollectionAccordion from "@/components/CollectionAccordion";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F4F2EC]">
      <HeroCanvas />

      {/* Elegant fade transition block overlapping the canvas bottom */}
      <SmoothFadeTransition />

      <CollectionAccordion />
    </main>
  );
}
