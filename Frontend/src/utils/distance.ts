/**
 * Haversine Formula for Geodesic Distance in Kilometers
 * @param coord1 [longitude, latitude]
 * @param coord2 [longitude, latitude]
 * @returns distance in km rounded to 2 decimal places
 */
export function calculateDistanceKm(
  coord1: [number, number] | undefined,
  coord2: [number, number] | undefined
): number {
  if (!coord1 || !coord2 || coord1.length < 2 || coord2.length < 2) {
    return 3.5; // fallback default distance
  }

  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  // Validate numbers
  if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) {
    return 3.5;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;

  return Math.round(dist * 100) / 100;
}

/**
 * Calculate dynamic delivery fee based on calculated distance
 * Tier 1 (<= 3.0 km): ₹25 base fee
 * Tier 2 (3.1 - 7.0 km): ₹25 + ₹8/km for distance beyond 3 km
 * Tier 3 (> 7.0 km): ₹57 + ₹10/km for distance beyond 7 km
 */
export function calculateDeliveryFee(distanceKm: number, hasItems: boolean = true): number {
  if (!hasItems || distanceKm <= 0) return 0;

  if (distanceKm <= 3.0) {
    return 25;
  } else if (distanceKm <= 7.0) {
    const extraKm = distanceKm - 3.0;
    return Math.round(25 + extraKm * 8);
  } else {
    const extraKm = distanceKm - 7.0;
    return Math.round(57 + extraKm * 10);
  }
}

/**
 * Calculate Estimated Delivery Time (ETA) based on distance
 */
export function calculateETA(distanceKm: number): string {
  if (distanceKm <= 0) return '20–25 min';
  const minMinutes = Math.round(15 + distanceKm * 2.5);
  const maxMinutes = Math.round(minMinutes + 6);
  return `${minMinutes}–${maxMinutes} min`;
}
