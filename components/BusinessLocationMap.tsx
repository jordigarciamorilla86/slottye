"use client";

import {
  useEffect,
  useRef,
} from "react";

type Props = {
  latitude: number;
  longitude: number;
  onChange: (
    latitude: number,
    longitude: number
  ) => void;
};

declare global {
  interface Window {
    google: any;
  }
}

export default function BusinessLocationMap({
  latitude,
  longitude,
  onChange,
}: Props) {
  const mapRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const key =
      process.env
        .NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!key || !mapRef.current) {
      return;
    }

    function createMap() {
      if (!mapRef.current) return;

      const center = {
        lat: latitude,
        lng: longitude,
      };

      const map =
        new window.google.maps.Map(
          mapRef.current,
          {
            center,
            zoom: 17,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          }
        );

      const marker =
        new window.google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });

      marker.addListener(
        "dragend",
        () => {
          const position =
            marker.getPosition();

          if (!position) return;

          onChange(
            position.lat(),
            position.lng()
          );
        }
      );
    }

    if (window.google?.maps) {
      createMap();
      return;
    }

    const existing =
      document.querySelector(
        'script[data-slottye-google-maps="true"]'
      );

    if (existing) {
      existing.addEventListener(
        "load",
        createMap
      );

      return;
    }

    const script =
      document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${key}`;

    script.async = true;
    script.defer = true;

    script.dataset.slottyeGoogleMaps =
      "true";

    script.onload = createMap;

    document.head.appendChild(script);
  }, [latitude, longitude, onChange]);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: 360,
        borderRadius: 18,
        overflow: "hidden",
        marginTop: 16,
      }}
    />
  );
}