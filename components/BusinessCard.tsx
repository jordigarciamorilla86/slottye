import Link from "next/link";

type Business = {
  slug: string;
  name: string;
  description?: string;
  address: string;
  city?: string;
  phone?: string;
  website?: string;
  imageUrl?: string | null;
  distance?: string | null;

  averageRating?: number | null;
  reviewCount?: number;
};

export function BusinessCard({
  business,
}: {
  business: Business;
}) {
  const fullAddress = [
    business.address,
    business.city,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasReviews =
    business.averageRating !== null &&
    business.averageRating !== undefined &&
    (business.reviewCount ?? 0) > 0;

  return (
    <Link
      className="card"
      href={`/business/${business.slug}`}
    >
      <div
        className="card-image"
        style={
          business.imageUrl
            ? {
                backgroundImage: `url(${business.imageUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <span className="distance">
          📍{" "}
          {business.distance ??
            "Ver ubicación"}
        </span>
      </div>

      <div className="card-body">
        <h3>{business.name}</h3>

        {hasReviews ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 6,
              marginBottom: 10,
            }}
          >
            <span
              style={{
                color: "#f59e0b",
                fontSize: 18,
              }}
            >
              ★
            </span>

            <strong>
              {business.averageRating!.toFixed(1)}
            </strong>

            <span className="muted">
              · {business.reviewCount}{" "}
              {business.reviewCount === 1
                ? "opinión"
                : "opiniones"}
            </span>
          </div>
        ) : (
          <div
            className="muted"
            style={{
              marginTop: 6,
              marginBottom: 10,
              fontSize: 14,
            }}
          >
            Sin opiniones todavía
          </div>
        )}

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
            <span>
              📍 {fullAddress}
            </span>
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