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

type Props = {
  businessId: string;
  services: Service[];
  loggedIn: boolean;
};

export function BusinessBookingSection({
  businessId,
  services,
  loggedIn,
}: Props) {
  const [
    selectedServiceId,
    setSelectedServiceId,
  ] =
    useState<string>(
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
    <>
      {/* ========================================================
          SERVICIOS
          ======================================================== */}

      <section className="section">
        <div className="section-head">
          <div>
            <h2>
              Servicios
            </h2>

            <p className="muted">
              Selecciona un servicio para consultar disponibilidad.
            </p>
          </div>
        </div>

        {services.length >
        0 ? (
          <div className="cards">
            {services.map(
              (
                service
              ) => (
                <div
                  className="card"
                  key={
                    service.id
                  }
                >
                  <div className="card-body">
                    <h3>
                      {service.name}
                    </h3>

                    {service.description && (
                      <p className="muted">
                        {service.description}
                      </p>
                    )}

                    <div
                      className="meta"
                      style={{
                        marginTop:
                          12,
                      }}
                    >
                      ⏱{" "}
                      {
                        service.duration_minutes
                      }{" "}
                      min
                    </div>

                    <div
                      style={{
                        marginTop:
                          18,
                      }}
                    >
                      <button
                        type="button"
                        className="btn primary"
                        onClick={() =>
                          showSlots(
                            service.id
                          )
                        }
                      >
                        Ver citas
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
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

      {/* ========================================================
          CITAS DISPONIBLES
          ======================================================== */}

      <section
        className="section"
        ref={
          slotsRef
        }
        style={{
          scrollMarginTop:
            20,
        }}
      >
        <div className="section-head">
          <div>
            <h2>
              Citas disponibles
            </h2>

            <p className="muted">
              Elige el día y la hora que mejor te vaya.
            </p>
          </div>
        </div>

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
        />
      </section>
    </>
  );
}