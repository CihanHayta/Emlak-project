import PropertyCard from "../common/PropertyCard";

/** Simple responsive grid of PropertyCard, shared by the Satılık/Kiralık pages. */
export default function PropertyGrid({ properties }) {
  if (properties.length === 0) {
    return (
      <p className="py-16 text-center text-gray-500">
        Bu kritere uygun ilan bulunamadı.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {properties.map((property) => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
