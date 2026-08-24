"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  Navigation,
} from "lucide-react";

type Props = {
  latitude: number;
  longitude: number;
  businessName: string;
};

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>
        ) => unknown;
        Marker: new (
          options: Record<string, unknown>
        ) => {
          addListener: (
            eventName: string,
            listener: () => void
          ) => void;
          getPosition: () =>
            | {
                lat: () => number;
                lng: () => number;
              }
            | null;
        };
      };
    };
  }
}

export default function PublicBusinessMap({
  latitude,
  longitude,
  businessName,
}: Props) {
  const mapRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    const key =
      process.env
        .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (
      !key ||
      !mapRef.current
    ) {
      return;
    }

    function createMap() {
      if (
        !mapRef.current
      ) {
        return;
      }

      const position = {
        lat:
          latitude,

        lng:
          longitude,
      };

      const map =
        new window.google.maps.Map(
          mapRef.current,
          {
            center:
              position,

            zoom:
              16,

            mapTypeControl:
              false,

            streetViewControl:
              false,

            fullscreenControl:
              false,
          }
        );

      new window.google.maps.Marker({
        position,
        map,
        title:
          businessName,
      });
    }

    if (
      window.google
        ?.maps
    ) {
      createMap();

      return;
    }

    const existing =
      document.querySelector(
        'script[data-slottye-google-maps="true"]'
      );

    if (
      existing
    ) {
      existing.addEventListener(
        "load",
        createMap
      );

      return;
    }

    const script =
      document.createElement(
        "script"
      );

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${key}`;

    script.async =
      true;

    script.defer =
      true;

    script.dataset
      .slottyeGoogleMaps =
      "true";

    script.onload =
      createMap;

    document.head
      .appendChild(
        script
      );
  }, [
    latitude,
    longitude,
    businessName,
  ]);

  function openDirections() {
    const destination =
      `${latitude},${longitude}`;

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div>
      <div
        ref={
          mapRef
        }
        style={{
          width:
            "100%",

          height:
            360,

          borderRadius:
            20,

          overflow:
            "hidden",
        }}
      />

      <button
        type="button"
        className="btn primary"
        onClick={
          openDirections
        }
        style={{
          marginTop:
            14,
        }}
      >
        <Navigation
          size={
            16
          }
          strokeWidth={
            2.2
          }
          aria-hidden="true"
        />

        Cómo llegar
      </button>
    </div>
  );
}
