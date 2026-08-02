import HeroSlider from "../components/home/HeroSlider";
import HeroSearchBar from "../components/home/HeroSearchBar";
import VideoShowcase from "../components/home/VideoShowcase";
import ServiceHighlights from "../components/home/ServiceHighlights";
import AllListingsSection from "../components/home/AllListingsSection";
import { getFeaturedVideos } from "../data/properties";
import { usePropertiesVersion } from "../hooks/usePropertiesVersion";

/**
 * Homepage ("/"): sliding hero banner -> the two "ev" (house/apartment)
 * video rows back-to-back (Satılık then Kiralık) -> service highlight
 * cards -> the two "arsa" (land) video rows back-to-back (Satılık then
 * Kiralık). Grouped by property type (evler together, arsalar together)
 * rather than by satılık/kiralık, per the agency owner's preference.
 *
 * All four video rows pull from the real backend via data/properties.js.
 */
export default function Home() {
  usePropertiesVersion(); // re-render once the async listings fetch resolves
  const saleVideos = getFeaturedVideos("satilik");
  const rentVideos = getFeaturedVideos("kiralik");
  const saleLandVideos = getFeaturedVideos("satilik", "Arsa");
  const rentLandVideos = getFeaturedVideos("kiralik", "Arsa");

  return (
    <>
      <HeroSlider />
      <HeroSearchBar />

      <VideoShowcase
        title="Satılık Evler "
        seeAllHref="/satilik"
        properties={saleVideos}
      />

      <VideoShowcase
        title="Kiralık Evler"
        seeAllHref="/kiralik"
        properties={rentVideos}
      />

      <ServiceHighlights />

      <VideoShowcase
        title="Satılık Arsalar"
        seeAllHref="/satilik"
        properties={saleLandVideos}
      />

      <VideoShowcase
        title="Kiralık Arsalar "
        seeAllHref="/kiralik"
        properties={rentLandVideos}
      />

      <AllListingsSection />
    </>
  );
}
