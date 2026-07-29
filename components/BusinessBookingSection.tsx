"use client";

import { useRef, useState } from "react";
import { AvailableSlots } from "@/components/AvailableSlots";

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
  services: Service[];
  slots: Slot[];
  loggedIn: boolean;
};

export function BusinessBookingSection({
  services,
  slots,
  loggedIn,
}: Props) {
  const [selectedServiceId, setSelectedServiceId] =
    useState<string>("all");

  const slotsRef = useRef<HTMLElement | null>(null);

  function showSlots(serviceId: string) {
    setSelectedServiceId(serviceId);

    // Esperamos a que React actualice el filtro
    // antes de bajar hasta las citas.
    setTimeout(() => {
      slotsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  return (
    <>
      <section className="section">
        <div className="section-head">
          <div>
            <h2>Servicios</h2>

            <p className="muted">
              Selecciona un servicio para consultar disponibilidad.
            </p>
          </div>
        </div>

        {services.length > 0 ? (
          <div className="cards">
            {services.map((service) => (
              <div
                className="card"
                key={service.id}
              >
                <div className="card-body">
                  <h3>{service.name}</h3>

                  {service.description && (
                    <p className="muted">
                      {service.description}
                    </p>
                  )}

                  <div
                    className="meta"
                    style={{ marginTop: 12 }}
                  >
                    ⏱ {service.duration_minutes} min
                  </div>

                  <div style={{ marginTop: 18 }}>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() =>
                        showSlots(service.id)
                      }
                    >
                      Ver citas
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel">
            <h3>
              Todavía no hay servicios publicados
            </h3>

            <p className="muted">
              Este negocio aún no ha configurado sus servicios.
            </p>
          </div>
        )}
      </section>

      <section
        className="section"
        ref={slotsRef}
        style={{
          scrollMarginTop: 20,
        }}
      >
        <div className="section-head">
          <div>
            <h2>Citas disponibles</h2>

            <p className="muted">
              Elige el día y la hora que mejor te vaya.
            </p>
          </div>
        </div>

        <AvailableSlots
          slots={slots}
          services={services}
          loggedIn={loggedIn}
          selectedServiceId={selectedServiceId}
          onServiceChange={setSelectedServiceId}
        />
      </section>
    </>
  );
}