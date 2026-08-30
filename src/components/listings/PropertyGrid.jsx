import PropertyCard from "../common/PropertyCard";
import "./PropertyGrid.css";

/** Simple responsive grid of PropertyCard, shared by the Satılık/Kiralık pages. */
export default function PropertyGrid({ properties }) {
  if (properties.length === 0) {
    return <p className="property-grid__empty">Bu kritere uygun ilan bulunamadı.</p>;
  }

  return (
    <div className="property-grid">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
