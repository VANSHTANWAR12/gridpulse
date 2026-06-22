export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

export function findNearestFacility(lat, lng, facilities) {
  if (!facilities || facilities.length === 0) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const facility of facilities) {
    // Only valid coordinates
    if (!facility.lat || !facility.lng) continue;
    
    const distance = getHaversineDistance(lat, lng, facility.lat, facility.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...facility, distance };
    }
  }
  
  return nearest;
}

export function findNearestHospital(lat, lng, allFacilities) {
  const hospitals = allFacilities.filter(f => f.type === 'hospital' || f.type === 'trauma_center');
  return findNearestFacility(lat, lng, hospitals);
}

export function findNearestFireStation(lat, lng, allFacilities) {
  const fireStations = allFacilities.filter(f => f.type === 'fire_station');
  return findNearestFacility(lat, lng, fireStations);
}

export function findNearestPoliceStation(lat, lng, allFacilities) {
  const policeStations = allFacilities.filter(f => f.type === 'police_station');
  return findNearestFacility(lat, lng, policeStations);
}
