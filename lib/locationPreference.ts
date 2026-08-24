export type StoredLocation = {
  latitude: number;
  longitude: number;
};

const LOCATION_KEY = "slottye-user-location";

export function readStoredLocation(): StoredLocation | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.sessionStorage.getItem(LOCATION_KEY);
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<StoredLocation>;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      !Number.isFinite(parsed.latitude) ||
      !Number.isFinite(parsed.longitude)
    ) {
      return null;
    }

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  } catch {
    return null;
  }
}

export function storeLocation(location: StoredLocation) {
  window.sessionStorage.setItem(
    LOCATION_KEY,
    JSON.stringify(location)
  );
}

export function clearStoredLocation() {
  window.sessionStorage.removeItem(LOCATION_KEY);
}
