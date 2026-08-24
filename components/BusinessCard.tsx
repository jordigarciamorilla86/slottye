import Link from "next/link";

import {
  ArrowRight,
  MapPin,
  Phone,
  Star,
} from "lucide-react";

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

  nextAvailableAt?: string | null;
};

function formatAvailability(
  value?: string | null
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  const now =
    new Date();

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const tomorrow =
    new Date(
      today
    );

  tomorrow.setDate(
    tomorrow.getDate() +
      1
  );

  const target =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  let dayLabel =
    date.toLocaleDateString(
      "es-ES",
      {
        day:
          "2-digit",

        month:
          "short",
      }
    );

  if (
    target.getTime() ===
    today.getTime()
  ) {
    dayLabel =
      "Hoy";
  } else if (
    target.getTime() ===
    tomorrow.getTime()
  ) {
    dayLabel =
      "Mañana";
  }

  return {
    dayLabel,

    time:
      date.toLocaleTimeString(
        "es-ES",
        {
          hour:
            "2-digit",

          minute:
            "2-digit",
        }
      ),
  };
}

export function BusinessCard({
  business,
}: {
  business: Business;
}) {
  const fullAddress =
    [
      business.address,
      business.city,
    ]
      .filter(Boolean)
      .join(" · ");

  const hasReviews =
    business.averageRating !== null &&
    business.averageRating !== undefined &&
    (business.reviewCount ?? 0) > 0;

  const availability =
    formatAvailability(
      business.nextAvailableAt
    );

  return (
    <Link
      className={
        business.imageUrl
          ? "business4-card has-image"
          : "business4-card"
      }
      href={`/business/${business.slug}`}
      aria-label={`Ver ${business.name}`}
    >
      <div
        className="business4-media"
        style={
          business.imageUrl
            ? {
                backgroundImage:
                  `url(${business.imageUrl})`,
              }
            : undefined
        }
      >
        <span className="business4-distance">
          <MapPin
            size={14}
            strokeWidth={2.2}
            aria-hidden="true"
          />

          {business.distance ??
            "Ver ubicación"}
        </span>
      </div>

      <div className="business4-main">
        <div className="business4-copy">
          <h3>
            {business.name}
          </h3>

          {business.description && (
            <p className="business4-description">
              {business.description}
            </p>
          )}

          {hasReviews ? (
            <div className="business4-rating">
              <Star
                size={15}
                fill="currentColor"
                strokeWidth={1.5}
                aria-hidden="true"
              />

              <strong>
                {business.averageRating!.toFixed(1)}
              </strong>

              <span>
                ({business.reviewCount}{" "}
                {business.reviewCount === 1
                  ? "opinión"
                  : "opiniones"})
              </span>
            </div>
          ) : (
            <span className="business4-no-reviews">
              Sin opiniones todavía
            </span>
          )}

          <div className="business4-meta">
            {fullAddress && (
              <div>
                <MapPin
                  size={15}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <span>
                  {fullAddress}
                </span>
              </div>
            )}

            {business.phone && (
              <div>
                <Phone
                  size={15}
                  strokeWidth={2}
                  aria-hidden="true"
                />

                <span>
                  {business.phone}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="business4-availability">
          <span className="business4-availability-label">
            Próxima disponibilidad
          </span>

          {availability ? (
            <>
              <strong className="business4-day">
                {
                  availability.dayLabel
                }
              </strong>

              <span className="business4-time">
                {
                  availability.time
                }
              </span>
            </>
          ) : (
            <strong className="business4-no-slot">
              Consultar
            </strong>
          )}

          <span className="business4-link">
            Ver todas las citas

            <ArrowRight
              size={14}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}