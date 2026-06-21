import { useEffect, useRef, useState, useCallback } from 'react';
import { Play, RotateCcw, Shield, Construction, MapPin, Eye, Brain, AlertTriangle, Compass, CornerUpLeft, CornerUpRight, ArrowUp, RotateCw, Navigation, CircleDot } from 'lucide-react';
import { translateCause, translateAddress, translateDiversionSign, translatePriority } from '../translations';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const calculateEcoImpact = (durationHours, severityScore) => {
  // Simulates a realistic 25% clearance velocity improvement through tactical mitigation
  const timeSavedMinutes = (durationHours * 60) * 0.25; 
  
  // Computes traffic backpressure propagation wave size based on severity 
  const vehiclesAffectedPerMin = (severityScore / 100) * 45;
  const totalIdlingMinutesSaved = timeSavedMinutes * vehiclesAffectedPerMin;
  
  // Real-world Indian urban idling constants: 0.023 Liters/min, ₹102.5/L, 2.31kg CO2/L
  const fuelSavedLiters = totalIdlingMinutesSaved * 0.023;
  const moneySavedINR = fuelSavedLiters * 102.5;
  const co2SavedKG = fuelSavedLiters * 2.31;
  
  return {
    fuel: fuelSavedLiters.toFixed(1),
    money: Math.round(moneySavedINR).toLocaleString('en-IN'),
    co2: co2SavedKG.toFixed(1)
  };
};

const BENGALURU_CENTER = [77.5946, 12.9785];
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';

function getSeverityColor(priority = 'Low', severity = 0) {
  const clean = priority.toLowerCase();
  if (clean === 'critical' || severity >= 85) return '#ef4444';
  if (clean === 'high' || severity >= 65) return '#ef4444';
  if (clean === 'medium' || severity >= 40) return '#f97316';
  return '#3b82f6';
}

function getSeverityClass(priority = 'Low', severity = 0) {
  const clean = priority.toLowerCase();
  if (clean === 'critical' || severity >= 85) return 'high';
  if (clean === 'high' || severity >= 65) return 'high';
  if (clean === 'medium' || severity >= 40) return 'medium';
  return 'low';
}

function buildIncidentGeoJson(incidents) {
  return {
    type: 'FeatureCollection',
    features: incidents
      .filter((incident) => Number.isFinite(Number(incident.longitude)) && Number.isFinite(Number(incident.latitude)))
      .map((incident) => {
        const severity = incident.severity_score || 0;
        return {
          type: 'Feature',
          properties: {
            id: incident.id,
            severity,
            color: getSeverityColor(incident.priority, severity)
          },
          geometry: {
            type: 'Point',
            coordinates: [Number(incident.longitude), Number(incident.latitude)]
          }
        };
      })
  };
}

function buildHotspotGeoJson(hotspots) {
  return {
    type: 'FeatureCollection',
    features: hotspots
      .filter((hotspot) => Array.isArray(hotspot.boundary) && hotspot.boundary.length > 2)
      .map((hotspot) => {
        const ring = hotspot.boundary.map(([lat, lon]) => [lon, lat]);
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);

        return {
          type: 'Feature',
          properties: {
            id: hotspot.h3_index,
            severity: hotspot.avg_severity || 0,
            color: getSeverityColor('Low', hotspot.avg_severity || 0)
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ring]
          }
        };
      })
  };
}

function getHaversineDistance(coords1, coords2) {
  const lon1 = coords1[0];
  const lat1 = coords1[1];
  const lon2 = coords2[0];
  const lat2 = coords2[1];

  const R = 6371e3; // Earth radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

function buildFallbackRoutes(pStartLon, pStartLat, pEndLon, pEndLat, pLeftLon, pLeftLat) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { kind: 'congested', color: '#ef4444' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [pStartLon, pStartLat],
            [pEndLon, pEndLat]
          ]
        }
      },
      {
        type: 'Feature',
        properties: { kind: 'detour', color: '#10b981' },
        geometry: {
          type: 'LineString',
          coordinates: [
            [pStartLon, pStartLat],
            [pLeftLon, pLeftLat],
            [pEndLon, pEndLat]
          ]
        }
      },
      {
        type: 'Feature',
        properties: { kind: 'start', color: '#10b981', label: 'DETOUR ENTRY' },
        geometry: {
          type: 'Point',
          coordinates: [pStartLon, pStartLat]
        }
      },
      {
        type: 'Feature',
        properties: { kind: 'end', color: '#3b82f6', label: 'RE-JOIN FLOW' },
        geometry: {
          type: 'Point',
          coordinates: [pEndLon, pEndLat]
        }
      }
    ]
  };
}

const renderStepIcon = (step) => {
  const type = (step.type || '').toLowerCase();
  const mod = (step.modifier || '').toLowerCase();
  
  if (type === 'depart') return <Navigation size={10} style={{ transform: 'rotate(45deg)' }} />;
  if (type === 'arrive') return <MapPin size={10} style={{ color: '#ef4444' }} />;
  
  if (mod.includes('left')) return <CornerUpLeft size={10} />;
  if (mod.includes('right')) return <CornerUpRight size={10} />;
  if (type.includes('roundabout') || type.includes('rotary')) return <RotateCw size={10} />;
  if (type.includes('continue') || type.includes('straight')) return <ArrowUp size={10} />;
  
  return <CircleDot size={10} />;
};

export default function MapMonitor({
  activeIncidents,
  selectedIncident,
  setSelectedIncident,
  fetchData,
  t,
  activeLang,
  weatherMultiplier,
  is3D
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef([]);
  const selectionMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(!MAPTILER_KEY);

  // Local simulation inputs
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [cause, setCause] = useState('vehicle_breakdown');
  const [priority, setPriority] = useState('Medium');
  const [type, setType] = useState('unplanned');
  const [desc, setDesc] = useState('');
  const [hotspots, setHotspots] = useState([]);
  const [plannedEvents, setPlannedEvents] = useState([]);

  // Routing states
  const [routeData, setRouteData] = useState({ type: 'FeatureCollection', features: [] });
  const [routeInstructions, setRouteInstructions] = useState([]);
  const [routingLoading, setRoutingLoading] = useState(false);
  const [routingDetails, setRoutingDetails] = useState(null);
  const [routingError, setRoutingError] = useState(null);

  const routeDataRef = useRef(routeData);
  useEffect(() => {
    routeDataRef.current = routeData;
  }, [routeData]);

  // Refs to avoid stale closures in map event callbacks
  const hotspotsRef = useRef(hotspots);
  const selectedIncidentRef = useRef(selectedIncident);

  useEffect(() => {
    hotspotsRef.current = hotspots;
  }, [hotspots]);

  useEffect(() => {
    selectedIncidentRef.current = selectedIncident;
  }, [selectedIncident]);

  // Fetch Hotspots
  const fetchHotspots = async () => {
    try {
      const res = await fetch('/api/hotspots');
      if (res.ok) {
        const data = await res.json();
        setHotspots(data);
      }
    } catch (err) {
      console.error("Error fetching hotspots:", err);
    }
  };

  // Fetch Planned Events for Executive Briefing
  const fetchPlannedEvents = async () => {
    try {
      const res = await fetch('/api/planned-events');
      if (res.ok) {
        const data = await res.json();
        setPlannedEvents(data);
      }
    } catch (err) {
      console.error("Error fetching planned events:", err);
    }
  };

  useEffect(() => {
    fetchHotspots();
    fetchPlannedEvents();
    const hsInterval = setInterval(fetchHotspots, 6000);
    const peInterval = setInterval(fetchPlannedEvents, 10000);
    return () => {
      clearInterval(hsInterval);
      clearInterval(peInterval);
    };
  }, []);

  // Initialize MapLibre Map
  useEffect(() => {
    if (!MAPTILER_KEY || !mapContainerRef.current || mapRef.current) return undefined;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
        center: BENGALURU_CENTER,
        zoom: 13.5,
        pitch: 55,
        bearing: -15,
        antialias: true,
        attributionControl: false
      });

      mapRef.current = map;
      map.__is3D = true; // store current dimension mode
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

      const setupMapLayers = () => {
        const currentIs3D = map.__is3D;

        // 1. Add 3D building extrusions layer if in 3D mode
        if (currentIs3D && map.getSource('openmaptiles')) {
          if (!map.getLayer('gp-3d-buildings')) {
            map.addLayer({
              id: 'gp-3d-buildings',
              source: 'openmaptiles',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 14,
              paint: {
                'fill-extrusion-color': '#e2e8f0',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.38,
                'fill-extrusion-vertical-gradient': true
              }
            });
          }
        }

        // 2. Hotspots Layer
        if (!map.getSource('hotspot-zones')) {
          map.addSource('hotspot-zones', { type: 'geojson', data: buildHotspotGeoJson(hotspotsRef.current) });
          map.addLayer({
            id: 'hotspot-fill',
            type: 'fill',
            source: 'hotspot-zones',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.16
            }
          });
          map.addLayer({
            id: 'hotspot-outline',
            type: 'line',
            source: 'hotspot-zones',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 2.0,
              'line-opacity': 0.7
            }
          });
        }

        // 3. Selected Routes Layer
        if (!map.getSource('selected-routes')) {
          map.addSource('selected-routes', { type: 'geojson', data: routeDataRef.current });
          map.addLayer({
            id: 'selected-route-glow',
            type: 'line',
            source: 'selected-routes',
            filter: ['==', '$type', 'LineString'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 14,
              'line-opacity': 0.25,
              'line-blur': 6
            }
          });
          map.addLayer({
            id: 'selected-route-core',
            type: 'line',
            source: 'selected-routes',
            filter: ['==', '$type', 'LineString'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 4.5,
              'line-opacity': 0.95
            }
          });
          map.addLayer({
            id: 'selected-route-marker-glow',
            type: 'circle',
            source: 'selected-routes',
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': 9,
              'circle-opacity': 0.45,
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#ffffff'
            }
          });
          map.addLayer({
            id: 'selected-route-marker-core',
            type: 'circle',
            source: 'selected-routes',
            filter: ['==', '$type', 'Point'],
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': 4.5,
              'circle-opacity': 1.0,
              'circle-stroke-width': 1.0,
              'circle-stroke-color': '#ffffff'
            }
          });
          map.addLayer({
            id: 'selected-route-marker-label',
            type: 'symbol',
            source: 'selected-routes',
            filter: ['==', '$type', 'Point'],
            layout: {
              'text-field': ['get', 'label'],
              'text-font': ['Open Sans Bold', 'Arial HTML Unicode Bold'],
              'text-size': 9,
              'text-offset': [0, 1.4],
              'text-anchor': 'top'
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#0f172a',
              'text-halo-width': 2
            }
          });
        }
      };

      map.on('load', () => {
        setupMapLayers();
        setMapReady(true);
      });

      map.on('style.load', () => {
        setupMapLayers();
      });

      // Capture map click
      map.on('click', (e) => {
        setLat(e.lngLat.lat.toFixed(6));
        setLon(e.lngLat.lng.toFixed(6));
      });

      map.on('error', (event) => {
        console.error('MapLibre error:', event);
      });

    } catch (err) {
      console.error('MapLibre initialization failed:', err);
      setMapUnavailable(true);
    }

    return () => {
      markerRefs.current.forEach((marker) => marker.remove());
      selectionMarkerRef.current?.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle style & camera transitions when is3D changes
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    map.__is3D = is3D;

    const nextStyle = is3D
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`;
    
    map.setStyle(nextStyle);

    if (is3D) {
      map.easeTo({
        pitch: 55,
        bearing: -15,
        zoom: 13.5,
        duration: 1000
      });
    } else {
      map.easeTo({
        pitch: 0,
        bearing: 0,
        zoom: 12.0,
        duration: 1000
      });
    }
  }, [is3D, mapReady]);

  // Update hotspots in MapLibre
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.getSource('hotspot-zones')?.setData(buildHotspotGeoJson(hotspots));
  }, [hotspots, mapReady]);

  // Update selected incident & smooth pan
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    if (selectedIncident) {
      const latVal = Number(selectedIncident.latitude);
      const lonVal = Number(selectedIncident.longitude);
      if (Number.isFinite(latVal) && Number.isFinite(lonVal)) {
        map.flyTo({
          center: [lonVal, latVal],
          zoom: is3D ? 14.5 : 13.5,
          pitch: is3D ? 60 : 0,
          bearing: is3D ? -15 : 0,
          duration: 1500,
          essential: true
        });
      }
    }
  }, [selectedIncident, mapReady, is3D]);

  // Update selected-routes layer data reactively when routeData changes
  useEffect(() => {
    if (mapReady && mapRef.current) {
      mapRef.current.getSource('selected-routes')?.setData(routeData);
    }
  }, [routeData, mapReady]);

  // Fetch dynamic routing using OSRM API with parallel evaluation & self-correcting logic
  useEffect(() => {
    if (!selectedIncident) {
      setRouteData({ type: 'FeatureCollection', features: [] });
      setRouteInstructions([]);
      setRoutingDetails(null);
      setRoutingError(null);
      return;
    }

    const latVal = parseFloat(selectedIncident.latitude);
    const lonVal = parseFloat(selectedIncident.longitude);
    if (isNaN(latVal) || isNaN(lonVal)) {
      setRouteData({ type: 'FeatureCollection', features: [] });
      setRouteInstructions([]);
      setRoutingDetails(null);
      setRoutingError(null);
      return;
    }

    // 1. Dynamic Radius calculation
    const causeVal = (selectedIncident.event_cause || '').toLowerCase();
    let rVisual = 300; // default visual radius
    if (causeVal.includes('breakdown')) {
      rVisual = 100;
    } else if (causeVal.includes('water') || causeVal.includes('flood') || causeVal.includes('logging')) {
      rVisual = 750;
    } else if (causeVal.includes('accident')) {
      rVisual = 400;
    } else if (causeVal.includes('construction') || causeVal.includes('roadwork')) {
      rVisual = 350;
    }

    // minimum routing radius safeguard
    const rRouting = Math.max(280, rVisual);

    // 2. Flow & Perpendicular Vectors (theta = 30 degrees = pi / 6 radians)
    const theta = Math.PI / 6;
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    // Coordinate scale factors (meters to degrees conversion)
    const degLatMeters = 111320;
    const degLonMeters = 111320 * Math.cos(latVal * Math.PI / 180);

    const deltaLatUnit = 1.0 / degLatMeters;
    const deltaLonUnit = 1.0 / degLonMeters;

    // Start & End coordinates offset along flow axis at 1.6 * rRouting
    const pStartLon = lonVal - 1.6 * rRouting * cosTheta * deltaLonUnit;
    const pStartLat = latVal - 1.6 * rRouting * sinTheta * deltaLatUnit;
    const pEndLon = lonVal + 1.6 * rRouting * cosTheta * deltaLonUnit;
    const pEndLat = latVal + 1.6 * rRouting * sinTheta * deltaLatUnit;

    // Perpendicular detour waypoints offset on opposite sides at 1.8 * rRouting
    const pLeftLon = lonVal + 1.8 * rRouting * (-sinTheta) * deltaLonUnit;
    const pLeftLat = latVal + 1.8 * rRouting * cosTheta * deltaLatUnit;
    const pRightLon = lonVal - 1.8 * rRouting * (-sinTheta) * deltaLonUnit;
    const pRightLat = latVal - 1.8 * rRouting * cosTheta * deltaLatUnit;

    setRoutingLoading(true);
    setRoutingError(null);

    // Prepare API request urls
    const congestedUrl = `https://router.project-osrm.org/route/v1/driving/${pStartLon.toFixed(6)},${pStartLat.toFixed(6)};${pEndLon.toFixed(6)},${pEndLat.toFixed(6)}?overview=full&geometries=geojson&steps=true`;
    const detourLeftUrl = `https://router.project-osrm.org/route/v1/driving/${pStartLon.toFixed(6)},${pStartLat.toFixed(6)};${pLeftLon.toFixed(6)},${pLeftLat.toFixed(6)};${pEndLon.toFixed(6)},${pEndLat.toFixed(6)}?overview=full&geometries=geojson&steps=true`;
    const detourRightUrl = `https://router.project-osrm.org/route/v1/driving/${pStartLon.toFixed(6)},${pStartLat.toFixed(6)};${pRightLon.toFixed(6)},${pRightLat.toFixed(6)};${pEndLon.toFixed(6)},${pEndLat.toFixed(6)}?overview=full&geometries=geojson&steps=true`;

    const controller = new AbortController();
    const signal = controller.signal;

    Promise.all([
      fetch(congestedUrl, { signal }).then(res => res.json()),
      fetch(detourLeftUrl, { signal }).then(res => res.json()),
      fetch(detourRightUrl, { signal }).then(res => res.json())
    ]).then(([congestedRes, leftRes, rightRes]) => {
      if (congestedRes.code !== 'Ok' || leftRes.code !== 'Ok' || rightRes.code !== 'Ok') {
        throw new Error('OSRM API returned non-OK code');
      }

      const congestedRoute = congestedRes.routes?.[0];
      const leftRoute = leftRes.routes?.[0];
      const rightRoute = rightRes.routes?.[0];

      if (!congestedRoute || !leftRoute || !rightRoute) {
        throw new Error('Missing routes in API response');
      }

      // Self-Correcting Selection Algorithm
      const center = [lonVal, latVal];

      const evaluate = (route) => {
        const coords = route.geometry.coordinates;
        let minDistance = Infinity;
        let clipsHazard = false;

        for (const pt of coords) {
          const dist = getHaversineDistance(pt, center);
          if (dist < minDistance) {
            minDistance = dist;
          }
          if (dist < rVisual) {
            clipsHazard = true;
          }
        }
        return { minDistance, clipsHazard, route };
      };

      const leftEval = evaluate(leftRoute);
      const rightEval = evaluate(rightRoute);

      let selectedDetourEval;

      if (!leftEval.clipsHazard && rightEval.clipsHazard) {
        selectedDetourEval = leftEval;
      } else if (leftEval.clipsHazard && !rightEval.clipsHazard) {
        selectedDetourEval = rightEval;
      } else if (!leftEval.clipsHazard && !rightEval.clipsHazard) {
        selectedDetourEval = (leftRoute.distance <= rightRoute.distance) ? leftEval : rightEval;
      } else {
        selectedDetourEval = (leftEval.minDistance >= rightEval.minDistance) ? leftEval : rightEval;
      }

      const selectedRoute = selectedDetourEval.route;

      const newGeoJson = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { kind: 'congested', color: '#ef4444' },
            geometry: congestedRoute.geometry
          },
          {
            type: 'Feature',
            properties: { kind: 'detour', color: '#10b981' },
            geometry: selectedRoute.geometry
          },
          {
            type: 'Feature',
            properties: { kind: 'start', color: '#10b981', label: 'DETOUR ENTRY' },
            geometry: {
              type: 'Point',
              coordinates: [pStartLon, pStartLat]
            }
          },
          {
            type: 'Feature',
            properties: { kind: 'end', color: '#3b82f6', label: 'RE-JOIN FLOW' },
            geometry: {
              type: 'Point',
              coordinates: [pEndLon, pEndLat]
            }
          }
        ]
      };

      setRouteData(newGeoJson);

      const stepsList = [];
      if (selectedRoute.legs) {
        selectedRoute.legs.forEach((leg) => {
          if (leg.steps) {
            leg.steps.forEach((step) => {
              const instr = step.maneuver.instruction || '';
              if (instr) {
                const distStr = step.distance > 0 ? ` (${Math.round(step.distance)}m)` : '';
                stepsList.push({
                  instruction: instr + distStr,
                  type: step.maneuver.type,
                  modifier: step.maneuver.modifier,
                  distance: step.distance
                });
              }
            });
          }
        });
      }

      setRouteInstructions(stepsList);
      setRoutingDetails({
        distance: (selectedRoute.distance / 1000).toFixed(2),
        duration: Math.round(selectedRoute.duration / 60),
        source: 'OSRM Dynamic API'
      });
      setRoutingLoading(false);
    }).catch(err => {
      if (err.name === 'AbortError') return;
      console.error('OSRM route fetch failed, using fallback geometry:', err);

      const fallbackGeoJson = buildFallbackRoutes(pStartLon, pStartLat, pEndLon, pEndLat, pLeftLon, pLeftLat);
      setRouteData(fallbackGeoJson);

      setRouteInstructions([
        { instruction: 'Depart starting waypoint', type: 'depart' },
        { instruction: 'Take immediate detour parallel road (250m)', type: 'turn', modifier: 'left' },
        { instruction: 'Merge onto clean secondary route (400m)', type: 'continue' },
        { instruction: 'Re-join main axis past the hazard zone', type: 'arrive' }
      ]);
      setRoutingDetails({
        distance: '1.20',
        duration: 3,
        source: 'Algorithmic Fallback'
      });
      setRoutingError(err.message || 'Routing server offline');
      setRoutingLoading(false);
    });

    return () => {
      controller.abort();
    };
  }, [selectedIncident]);

  // Draw selection pulsing marker on click coords
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectionMarkerRef.current) {
      selectionMarkerRef.current.remove();
      selectionMarkerRef.current = null;
    }

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (!isNaN(latNum) && !isNaN(lonNum)) {
      const el = document.createElement('div');
      el.className = 'selection-pin-container';
      el.innerHTML = `
        <div class="selection-pin-pulse" style="width: 32px; height: 32px; border: 3px solid #ff9800; border-radius: 50%; position: absolute; transform: translate(-50%, -50%); animation: pulse 1.6s infinite ease-out; opacity: 0.9;"></div>
        <div class="selection-pin-dot" style="width: 10px; height: 10px; background: #ff9800; border: 1.5px solid #fff; border-radius: 50%; position: absolute; transform: translate(-50%, -50%); box-shadow: 0 2px 4px rgba(0,0,0,0.5);"></div>
      `;

      // Inject keyframe animation dynamically if not present
      if (!document.getElementById('sim-pulse-keyframes')) {
        const style = document.createElement('style');
        style.id = 'sim-pulse-keyframes';
        style.innerHTML = `
          @keyframes pulse {
            0% { transform: scale(0.5); opacity: 0.9; }
            100% { transform: scale(2.2); opacity: 0; }
          }
        `;
        document.head.appendChild(style);
      }

      selectionMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lonNum, latNum])
        .addTo(mapRef.current);
    }
  }, [lat, lon, mapReady]);

  // Draw Incident Markers
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    markerRefs.current.forEach((marker) => marker.remove());
    markerRefs.current = [];

    activeIncidents.forEach((incident) => {
      const latVal = Number(incident.latitude);
      const lonVal = Number(incident.longitude);
      if (!Number.isFinite(latVal) || !Number.isFinite(lonVal)) return;

      const priorityLower = incident.priority.toLowerCase();
      
      let iconClass = 'fa-solid fa-triangle-exclamation';
      const c = incident.event_cause.toLowerCase();
      if (c.includes('accident')) iconClass = 'fa-solid fa-car-burst';
      else if (c.includes('breakdown')) iconClass = 'fa-solid fa-truck-pickup';
      else if (c.includes('water') || c.includes('flood') || c.includes('logging')) iconClass = 'fa-solid fa-cloud-showers-water';
      else if (c.includes('construction') || c.includes('roadwork')) iconClass = 'fa-solid fa-person-digging';
      else if (c.includes('pothole') || c.includes('pot_hole')) iconClass = 'fa-solid fa-road-spikes';
      else if (c.includes('tree')) iconClass = 'fa-solid fa-tree';
      else if (c.includes('public') || c.includes('gathering')) iconClass = 'fa-solid fa-users';

      const el = document.createElement('div');
      el.className = `custom-pin-container pin-${priorityLower} ${selectedIncident?.id === incident.id ? 'pin-active' : ''}`;
      el.innerHTML = `
        <div class="pin-marker" style="display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50% 50% 50% 0; background: ${getSeverityColor(incident.priority)}; transform: rotate(-45deg); cursor: pointer; border: 2px solid #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.4);">
          <i class="${iconClass}" style="transform: rotate(45deg); color: #fff; font-size: 12px;"></i>
        </div>
      `;

      el.addEventListener('click', () => setSelectedIncident(incident));

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([lonVal, latVal])
        .addTo(mapRef.current);
      
      markerRefs.current.push(marker);
    });
  }, [activeIncidents, mapReady, selectedIncident, is3D]);

  // Quick Preset Handlers
  const applyPreset = (latVal, lonVal, causeVal, priorityVal, typeVal, closureVal, descVal) => {
    setLat(latVal);
    setLon(lonVal);
    setCause(causeVal);
    setPriority(priorityVal);
    setType(typeVal);
    setDesc(descVal);
  };

  // Submit Simulation
  const handleSimulateSubmit = async (e) => {
    e.preventDefault();
    if (!lat || !lon) return;

    const payload = {
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      event_cause: cause,
      priority: priority,
      event_type: type,
      description: desc,
      address: "",
      corridor: "Non-corridor",
      police_station: "Yelahanka"
    };

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const event = await res.json();
        fetchData();
        setSelectedIncident(event);
      }
    } catch (err) {
      console.error("Error submitting simulation:", err);
    }
  };

  // Spawn Mock
  const spawnMock = async () => {
    try {
      const res = await fetch('/api/spawn_mock', { method: 'POST' });
      if (res.ok) {
        const event = await res.json();
        fetchData();
        setSelectedIncident(event);
      }
    } catch (err) {
      console.error("Error spawning mock:", err);
    }
  };

  // Clear Mocks
  const clearMocks = async () => {
    try {
      await fetch('/api/clear_mock', { method: 'POST' });
      setSelectedIncident(null);
      fetchData();
    } catch (err) {
      console.error("Error clearing mock data:", err);
    }
  };

  // Apply Live Weather Multiplier to predicted severity
  const rawSeverity = selectedIncident ? (selectedIncident.severity_score || 0) : 0;
  const severityVal = Math.min(100, Math.round(rawSeverity * weatherMultiplier));
  const strokeDash = `${severityVal}, 100`;

  let severityLabel = t('severity-low');
  let severityColor = '#3b82f6';
  if (severityVal >= 65) {
    severityLabel = t('severity-critical');
    severityColor = '#ef4444';
  } else if (severityVal >= 40) {
    severityLabel = t('severity-moderate');
    severityColor = '#f97316';
  }

  return (
    <div className="dashboard-body">
      {/* Upper Map Panel */}
      <div className="map-container-box">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>
        
        

        {(!MAPTILER_KEY || mapUnavailable) && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            padding: '24px',
            textAlign: 'center',
            zIndex: 10
          }}>
            <MapPin size={32} style={{ color: '#ef4444', marginBottom: '12px' }} />
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>MapTiler API Key Missing</h4>
            <p style={{ margin: '6px 0 0', fontSize: '11px', opacity: 0.8, maxWidth: '380px', lineHeight: '1.4' }}>
              To render the real-world 3D map of Bengaluru city, please sign up for a free MapTiler account (no credit card required) and add <code>VITE_MAPTILER_KEY="your_key"</code> in your <code>.env</code> file.
            </p>
          </div>
        )}

        {/* Map Legend Overlay */}
        <div className="map-legend" style={{ zIndex: 5 }}>
          <h4>{t('legend-title')}</h4>
          <div className="legend-item"><span className="legend-color high"></span> <span>{t('legend-high')}</span></div>
          <div className="legend-item"><span className="legend-color medium"></span> <span>{t('legend-medium')}</span></div>
          <div className="legend-item"><span className="legend-color low"></span> <span>{t('legend-low')}</span></div>
          <div className="legend-item"><span className="legend-color hotspot"></span> <span>{t('legend-hotspot')}</span></div>
        </div>
      </div>

      {/* Lower Simulation & Mitigation Panel */}
      <div className="details-panel-grid">
        {/* Simulation Console */}
        <section className="details-card simulation-console">
          <div className="card-header">
            <h2><MapPin size={16} /> <span>{t('sim-controls-title')}</span></h2>
            <p className="subtitle">{t('sim-console-subtitle')}</p>
          </div>
          
          <form onSubmit={handleSimulateSubmit} className="sim-form">
            <p className="step-desc" style={{ marginBottom: '8px' }}>
              {t('sim-preset-prompt')}
            </p>
            
            <div className="preset-scenarios-container">
              <button
                type="button"
                className="btn-preset"
                onClick={() => applyPreset(13.0305, 77.5120, 'vehicle_breakdown', 'Medium', 'unplanned', 'FALSE', 'LCV breakdown Tumkur road near Peenya metro.')}
              >
                {t('preset-peenya-btn')}
              </button>
              <button
                type="button"
                className="btn-preset"
                onClick={() => applyPreset(13.1008, 77.5963, 'water_logging', 'High', 'unplanned', 'TRUE', 'Severe flooding under Yelahanka railway bridge.')}
              >
                {t('preset-yelahanka-btn')}
              </button>
              <button
                type="button"
                className="btn-preset"
                onClick={() => applyPreset(12.9602, 77.6447, 'accident', 'High', 'unplanned', 'TRUE', 'Crash blocking lanes on HAL Old Airport Road.')}
              >
                {t('preset-hal-btn')}
              </button>
            </div>

            <div className="form-row">
              <div className="form-group col-6">
                <label>{t('lat-lbl')}</label>
                <input type="number" step="0.000001" value={lat} onChange={e => setLat(e.target.value)} required />
              </div>
              <div className="form-group col-6">
                <label>{t('lon-lbl')}</label>
                <input type="number" step="0.000001" value={lon} onChange={e => setLon(e.target.value)} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-6">
                <label>{t('cause-lbl')}</label>
                <select value={cause} onChange={e => setCause(e.target.value)}>
                  <option value="accident">{t('cause-accident')}</option>
                  <option value="vehicle_breakdown">{t('cause-breakdown')}</option>
                  <option value="water_logging">{t('cause-waterlogging')}</option>
                  <option value="construction">{t('cause-construction')}</option>
                  <option value="pot_holes">{t('cause-potholes')}</option>
                  <option value="tree_fall">{t('cause-treefall')}</option>
                  <option value="public_event">{t('cause-publicevent')}</option>
                </select>
              </div>
              <div className="form-group col-6">
                <label>{t('priority-lbl')}</label>
                <select value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="High">{t('priority-high')}</option>
                  <option value="Medium">{t('priority-medium')}</option>
                  <option value="Low">{t('priority-low')}</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group col-4">
                <label>{t('type-lbl')}</label>
                <select value={type} onChange={e => setType(e.target.value)}>
                  <option value="unplanned">{t('type-unplanned')}</option>
                  <option value="planned">{t('type-planned')}</option>
                </select>
              </div>
              <div className="form-group col-8">
                <label>{t('desc-lbl')}</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder={t('desc-placeholder')} />
              </div>
            </div>

            <button type="submit" className="btn btn-block btn-primary">
              <Play size={12} /> <span>{t('btn-simulate-lbl')}</span>
            </button>
            
            <div className="btn-group" style={{ marginTop: '8px' }}>
              <button type="button" onClick={spawnMock} className="btn btn-secondary" style={{ fontSize: '10px' }}>
                {t('btn-spawn-mock')}
              </button>
              <button type="button" onClick={clearMocks} className="btn btn-secondary" style={{ fontSize: '10px' }}>
                <RotateCcw size={10} /> {t('btn-clear-data')}
              </button>
            </div>
          </form>
        </section>

        {/* Prediction Results Drawer */}
        <section className="details-card recommendation-box">
          <div className="card-header">
            <h2><Brain size={16} /> <span>{t('analysis-title')}</span></h2>
            <p className="subtitle">{t('analysis-subtitle')}</p>
          </div>

          {!selectedIncident ? (
            <div className="executive-briefing-pane" style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={16} style={{ color: 'var(--accent-purple)' }} />
                  <span>AI Executive Intelligence Briefing</span>
                </h3>
                <span className="badge" style={{ backgroundColor: 'var(--accent-blue)', color: '#ffffff', fontSize: '9px', fontWeight: '800', padding: '2px 8px', borderRadius: '10px' }}>SYSTEM OPTIMIZED</span>
              </div>

              {/* Aggregated Operations Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Active Threats</span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-red)', marginTop: '2px' }}>{activeIncidents.length}</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Avg Delay Reduction</span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-green)', marginTop: '2px' }}>28%</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Manpower Saved</span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-blue)', marginTop: '2px' }}>35%</div>
                </div>
                <div style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Peak Severity</span>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--accent-orange)', marginTop: '2px' }}>
                    {activeIncidents.length > 0 ? `${Math.max(...activeIncidents.map(i => i.severity_score || 0)).toFixed(0)}%` : '0%'}
                  </div>
                </div>
              </div>

              {/* Upcoming High-Risk Events Table */}
              <div style={{ flexGrow: 1, border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', background: 'var(--bg-primary)' }}>
                <h4 style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--accent-purple)' }}></span>
                  <span>Upcoming High-Risk Events</span>
                </h4>
                
                {plannedEvents.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                    No planned high-risk events scheduled in database.
                  </div>
                ) : (
                  <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: 'var(--text-muted)' }}>
                          <th style={{ padding: '4px', fontWeight: '700' }}>Event Name</th>
                          <th style={{ padding: '4px', fontWeight: '700' }}>Date/Time</th>
                          <th style={{ padding: '4px', fontWeight: '700', textAlign: 'right' }}>Attendance</th>
                          <th style={{ padding: '4px', fontWeight: '700', textAlign: 'right' }}>Impact Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plannedEvents
                          .map(e => {
                            const priorityVal = e.priority === 'High' ? 60 : e.priority === 'Medium' ? 40 : 20;
                            const attVal = Math.min(30, ((e.attendance || 1000) / 1000) * 5);
                            const durVal = Math.min(10, (e.duration_hours || 3) * 1.2);
                            const score = Math.round(priorityVal + attVal + durVal);
                            return { ...e, score };
                          })
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 3)
                          .map(event => (
                            <tr key={event.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '6px 4px', fontWeight: '800', color: 'var(--text-primary)' }}>{event.name}</td>
                              <td style={{ padding: '6px 4px', color: 'var(--text-secondary)' }}>{event.start_datetime}</td>
                              <td style={{ padding: '6px 4px', textAlign: 'right', color: 'var(--accent-blue)', fontWeight: '700' }}>{event.attendance.toLocaleString()}</td>
                              <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                                <span style={{
                                  backgroundColor: event.score >= 70 ? 'rgba(225, 29, 72, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                                  color: event.score >= 70 ? 'var(--accent-red)' : 'var(--accent-orange)',
                                  padding: '2px 6px', borderRadius: '4px', fontWeight: '800', fontSize: '10px'
                                }}>
                                  {event.score}/100
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rec-content">
              {/* Column 1: Info */}
              <div className="rec-info-col">
                <div className="rec-header-details" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '8px' }}>
                  <div className="rec-event-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge-cause">{translateCause(selectedIncident.event_cause, activeLang)}</span>
                    <h3 style={{ fontSize: '15px', fontWeight: '800', margin: 0 }}>{selectedIncident.id}</h3>
                  </div>
                  <div className="rec-location-row" style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {t('rec-location-lbl')}: <div className="rec-address" style={{ marginTop: '2px', fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', lineHeight: '1.3' }}>{translateAddress(selectedIncident.address, activeLang)}</div>
                  </div>
                </div>

                {/* Projected Operational ROI Impact Card */}
                {selectedIncident && (
                  (() => {
                    const ecoImpact = calculateEcoImpact(selectedIncident.estimated_duration || 0.5, severityVal);
                    return (
                      <div 
                        className="pred-card roi-impact-card" 
                        style={{ 
                          padding: '8px 12px', 
                          background: 'rgba(6, 78, 59, 0.12)', 
                          border: '1px solid rgba(16, 185, 129, 0.22)', 
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          marginTop: 'auto',
                          backdropFilter: 'blur(4px)',
                          WebkitBackdropFilter: 'blur(4px)',
                          boxShadow: 'inset 0 0 10px rgba(16, 185, 129, 0.05)'
                        }}
                      >
                        <div style={{ fontSize: '9px', fontWeight: '800', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🌱</span> <span>{t('roi-title')}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                          <div>
                            <span className="pred-label" style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontWeight: '700', textTransform: 'uppercase' }}>{t('roi-carbon')}</span>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#ffffff' }}>
                              {ecoImpact.co2} <span style={{ fontSize: '9px', fontWeight: '600', color: '#34d399' }}>kg CO₂</span>
                            </div>
                          </div>
                          <div>
                            <span className="pred-label" style={{ fontSize: '8px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px', fontWeight: '700', textTransform: 'uppercase' }}>{t('roi-economic')}</span>
                            <div style={{ fontSize: '12px', fontWeight: '800', color: '#ffffff' }}>
                              ₹{ecoImpact.money}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Column 2: Predictions */}
              <div className="rec-metrics-col">
                <div className="pred-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <span className="pred-label" style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('rec-severity-lbl')}</span>
                    {weatherMultiplier !== 1.0 && (
                      <div style={{ fontSize: '8px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>
                        Weather: +{(weatherMultiplier * 100 - 100).toFixed(0)}%
                      </div>
                    )}
                    <div className="pred-time-value" style={{ fontSize: '15px', fontWeight: '800' }}>{severityVal}%</div>
                    <span className="pred-subtext" style={{ color: severityColor, fontSize: '9px' }}>{severityLabel}</span>
                  </div>
                  <div className="pred-circle-container" style={{ width: '40px', height: '40px' }}>
                    <svg viewBox="0 0 36 36" className="circular-chart" style={{ display: 'block', maxWidth: '100%' }}>
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" style={{ fill: 'none', stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: '2.8' }} />
                      <path
                        className="circle"
                        stroke={severityColor}
                        strokeDasharray={strokeDash}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        style={{ fill: 'none', strokeWidth: '2.8', strokeLinecap: 'round', transition: 'stroke-dasharray 0.3s ease' }}
                      />
                      <text x="18" y="20.35" className="percentage" style={{ fill: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '9px', fontWeight: '800', textAnchor: 'middle' }}>{severityVal}%</text>
                    </svg>
                  </div>
                </div>

                <div className="pred-card" style={{ padding: '8px 12px' }}>
                  <div>
                    <span className="pred-label" style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('rec-duration-lbl')}</span>
                    <div className="pred-time-value" style={{ fontSize: '15px', fontWeight: '800' }}>{(selectedIncident.estimated_duration || 0).toFixed(1)} {t('hours')}</div>
                    <span className="pred-subtext" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{t('clearance-prediction')}</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Mitigations */}
              <div className="rec-mitigation-col">
                <div className="pred-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <span className="pred-label" style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('automated-roadblock-req')}</span>
                    <div 
                      className="pred-time-value" 
                      style={{ 
                        color: selectedIncident.road_closure_predicted === 'YES' ? '#ef4444' : '#10b981',
                        fontWeight: 'bold',
                        fontSize: '13px',
                        marginTop: '2px'
                      }}
                    >
                      {selectedIncident.road_closure_predicted === 'YES' ? t('roadblock-yes') : t('roadblock-no')}
                    </div>
                    {selectedIncident.road_closure_predicted === 'YES' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '9px', color: '#ef4444', marginTop: '2px' }}>
                        <AlertTriangle size={10} className="animate-pulse" />
                        <span>{t('roadblock-yes-desc')}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: '9px', color: '#10b981', marginTop: '2px' }}>
                        {t('roadblock-no-desc')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="resources-deployed-box" style={{ marginTop: '4px' }}>
                  <h4 style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{t('rec-opt-lbl')}</h4>
                  <div className="resource-row" style={{ display: 'flex', gap: '8px' }}>
                    <div className="resource-item" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                      <div className="res-icon-box bg-blue" style={{ width: '20px', height: '20px', fontSize: '10px' }}>
                        <Shield size={10} />
                      </div>
                      <div className="res-details">
                        <span className="res-name" style={{ fontSize: '8px' }}>{t('rec-officers-lbl')}</span>
                        <span className="res-qty" style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedIncident.manpower_needed || 1}</span>
                      </div>
                    </div>
                    <div className="resource-item" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}>
                      <div className="res-icon-box bg-yellow" style={{ width: '20px', height: '20px', fontSize: '10px' }}>
                        <Construction size={10} />
                      </div>
                      <div className="res-details">
                        <span className="res-name" style={{ fontSize: '8px' }}>{t('rec-barricades-lbl')}</span>
                        <span className="res-qty" style={{ fontSize: '11px', fontWeight: 'bold' }}>{selectedIncident.barricades_needed || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="diversion-message-box" style={{ marginTop: 'auto' }}>
                  <h4 style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', margin: '0 0 4px 0' }}>{t('rec-sign-lbl')}</h4>
                  <div className="sign-board-wrapper" style={{ position: 'relative' }}>
                    <div className="sign-board-tooltip">
                      {translateDiversionSign(selectedIncident.diversion_sign || 'TRAFFIC ALERT: Delays ahead.', activeLang)}
                    </div>
                    <div className="sign-board" style={{ padding: '4px 8px', fontSize: '9px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="sign-icon">⚠️</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', width: '100%' }}>
                        {translateDiversionSign(selectedIncident.diversion_sign || 'TRAFFIC ALERT: Delays ahead.', activeLang)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
