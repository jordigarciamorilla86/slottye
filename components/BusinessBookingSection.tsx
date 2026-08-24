"use client";

import {
  useRef,
  useState,
} from "react";

import {
  AvailableSlots,
} from "@/components/AvailableSlots";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
};

type Slot = {
  id: string;
  service_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
};

type Props = {
  businessId: string;
  services: Service[];
  loggedIn: boolean;

  requestedSlot:
    Slot | null;
};

export function BusinessBookingSection({
  businessId,
  services,
  loggedIn,
  requestedSlot,
}: Props) {
  const [
    selectedServiceId,
    setSelectedServiceId,
  ] =
    useState(
      requestedSlot
        ?.service_id ??
        "all"
    );

  const slotsRef =
    useRef<HTMLElement | null>(
      null
    );

  function showSlots(
    serviceId:
      string
  ) {
    setSelectedServiceId(
      serviceId
    );

    window.setTimeout(
      () => {
        slotsRef.current
          ?.scrollIntoView({
            behavior:
              "smooth",

            block:
              "start",
          });
      },
      50
    );
  }

  return (
    <div className="business6-booking">
      <section
        id="servicios"
        className="business6-services-section"
      >
        <div className="business6-section-heading">
          <div>
            <h2>
              Servicios
            </h2>

            <p>
              Elige un servicio para ver sus próximas citas.
            </p>
          </div>
        </div>

        {services.length >
        0 ? (
          <div className="business6-services-grid">
            {services.map(
              (
                service
              ) => (
                <article
                  className="business6-service-card"
                  key={
                    service.id
                  }
                >
                  <div>
                    <h3>
                      {service.name}
                    </h3>

                    {service.description && (
                      <p>
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="business6-service-bottom">
                    <span>
                      ⏱ {service.duration_minutes} min
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        showSlots(
                          service.id
                        )
                      }
                    >
                      Ver citas →
                    </button>
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="business6-empty">
            <strong>
              Todavía no hay servicios publicados
            </strong>

            <span>
              Este negocio aún no ha configurado sus servicios.
            </span>
          </div>
        )}
      </section>

      <section
        id="citas"
        ref={
          slotsRef
        }
        className="business6-booking-panel"
      >
        <AvailableSlots
          businessId={
            businessId
          }
          services={
            services
          }
          loggedIn={
            loggedIn
          }
          selectedServiceId={
            selectedServiceId
          }
          onServiceChange={
            setSelectedServiceId
          }
          requestedSlot={
            requestedSlot
          }
        />
      </section>
    </div>
  );
}