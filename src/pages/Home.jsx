import HeroSlider from "../components/home/HeroSlider";
import HeroSearchBar from "../components/home/HeroSearchBar";
import VideoShowcase from "../components/home/VideoShowcase";
import ServiceHighlights from "../components/home/ServiceHighlights";
import { getFeaturedVideos } from "../data/properties";

/**
 * Homepage ("/"): sliding hero banner -> the two "ev" (house/apartment)
 * video rows back-to-back (Satılık then Kiralık) -> service highlight
 * cards -> the two "arsa" (land) video rows back-to-back (Satılık then
 * Kiralık). Grouped by property type (evler together, arsalar together)
 * rather than by satılık/kiralık, per the agency owner's preference.
 *
 * All four video rows pull from the static sample data in data/properties.js.
 * Once the admin panel exists, swap `getFeaturedVideos` for a real fetch and
 * the rest of this page (and VideoShowcase/PropertyCard) needs no changes.
 */
export default function Home() {
  const saleVideos = getFeaturedVideos("satilik");
  const rentVideos = getFeaturedVideos("kiralik");
  const saleLandVideos = getFeaturedVideos("satilik", "Arsa");
  const rentLandVideos = getFeaturedVideos("kiralik", "Arsa");

  return (
    <>
      <HeroSlider />
      <HeroSearchBar />

      <VideoShowcase
        title="Satılık Evler – Video Serisi"
        seeAllHref="/satilik"
        properties={saleVideos}
      />

      <VideoShowcase
        title="Kiralık Evler – Video Serisi"
        seeAllHref="/kiralik"
        properties={rentVideos}
      />

      <ServiceHighlights />

      <VideoShowcase
        title="Satılık Arsalar – Video Serisi"
        seeAllHref="/satilik"
        properties={saleLandVideos}
      />

      <VideoShowcase
        title="Kiralık Arsalar – Video Serisi"
        seeAllHref="/kiralik"
        properties={rentLandVideos}
      />
    </>
  );
}
