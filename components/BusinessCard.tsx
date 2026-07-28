import Link from "next/link";

type Business = {
  slug: string;
  name: string;
  description?: string;
  address: string;
  city?: string;
  phone?: string;
  website?: string;
};

export function BusinessCard({
  business,
}: {
  business: Business;
}) {
  const fullAddress = [business.address, business.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      className="card"
      href={`/business/${business.slug}`}
    >
      <div className="card-image">
        <span className="distance">
          📍 Negocio en Slottye
        </span>
      </div>

      <div className="card-body">
        <h3>{business.name}</h3>

        {business.description && (
          <p
            className="muted"
            style={{
              marginTop: 6,
              marginBottom: 12,
            }}
          >
            {business.description}
          </p>
        )}

        {fullAddress && (
          <div className="meta">
            <span>📍 {fullAddress}</span>
          </div>
        )}

        {business.phone && (
          <div className="meta">
            ☎ {business.phone}
          </div>
        )}

        <div className="next-slot">
          <span className="muted">
            Próximas citas
          </span>

          <span className="slot-pill">
            Ver disponibilidad
          </span>
        </div>
      </div>
    </Link>
  );
}