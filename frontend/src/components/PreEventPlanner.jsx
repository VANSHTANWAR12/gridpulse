/* global L */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { translateCause, translatePriority, translateDiversionSign, translateAddress } from '../translations';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Shield, 
  Construction, 
  Trash2, 
  AlertTriangle, 
  Play, 
  Compass, 
  Building,
  Navigation,
  Download
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const BENGALURU_CENTER = [77.5946, 12.9785];
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
const API_URL = import.meta.env.VITE_API_URL || '';

function getSeverityColor(priority = 'Low', severity = 0) {
  const clean = priority.toLowerCase();
  if (clean === 'critical' || severity >= 85) return '#ef4444';
  if (clean === 'high' || severity >= 65) return '#ef4444';
  if (clean === 'medium' || severity >= 40) return '#f97316';
  return '#3b82f6';
}

function calculateImpactScore(event) {
  if (!event) return 0;
  const priorityVal = event.priority === 'High' ? 60 : event.priority === 'Medium' ? 40 : 20;
  const attVal = Math.min(30, ((event.attendance || 1000) / 1000) * 5);
  const durVal = Math.min(10, (event.duration_hours || 3) * 1.2);
  return Math.round(priorityVal + attVal + durVal);
}

const buildHexagonGeoJson = (simData) => {
  if (!simData || !simData.hexagons) return { type: 'FeatureCollection', features: [] };
  
  return {
    type: 'FeatureCollection',
    features: simData.hexagons
      .filter((hex) => Array.isArray(hex.boundary) && hex.boundary.length > 2)
      .map((hex) => {
        const ring = hex.boundary.map(([lat, lon]) => [lon, lat]);
        const first = ring[0];
        const last = ring[ring.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
        
        let hexColor = '#3b82f6';
        if (hex.severity >= 65) hexColor = '#ef4444';
        else if (hex.severity >= 40) hexColor = '#f97316';
        else if (hex.severity >= 25) hexColor = '#f59e0b';
        
        return {
          type: 'Feature',
          properties: {
            id: hex.h3_index,
            severity: hex.severity,
            color: hexColor
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ring]
          }
        };
      })
  };
};

export default function PreEventPlanner({ t, activeLang, is3D }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const allEventsMarkersRef = useRef([]);
  const selectedEventMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(!MAPTILER_KEY);

  // Scheduled events state
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Slider time step state
  const [timeStep, setTimeStep] = useState(0);
  const [simulation, setSimulation] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [cause, setCause] = useState('public_event');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [durationHours, setDurationHours] = useState('3');
  const [attendance, setAttendance] = useState('1000');
  const [priority, setPriority] = useState('Medium');

  const [loadingSim, setLoadingSim] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  // Refs to prevent stale closures
  const simulationRef = useRef(simulation);
  useEffect(() => {
    simulationRef.current = simulation;
  }, [simulation]);

  // Fetch all scheduled events
  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/planned-events`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (err) {
      console.error("Error fetching planned events:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Initialize MapLibre
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
      map.__is3D = true;
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

      const setupMapLayers = () => {
        const currentIs3D = map.__is3D;
        
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

        if (!map.getSource('propagation-zones')) {
          map.addSource('propagation-zones', {
            type: 'geojson',
            data: buildHexagonGeoJson(simulationRef.current)
          });

          map.addLayer({
            id: 'propagation-fill',
            type: 'fill',
            source: 'propagation-zones',
            paint: {
              'fill-color': ['get', 'color'],
              'fill-opacity': 0.28
            }
          });

          map.addLayer({
            id: 'propagation-outline',
            type: 'line',
            source: 'propagation-zones',
            paint: {
              'line-color': ['get', 'color'],
              'line-width': 1.5,
              'line-opacity': 0.6,
              'line-dasharray': [3, 3]
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

      map.on('click', (e) => {
        setLat(e.lngLat.lat.toFixed(6));
        setLon(e.lngLat.lng.toFixed(6));
      });

    } catch (err) {
      console.error("MapLibre init error in planner:", err);
      setMapUnavailable(true);
    }

    return () => {
      allEventsMarkersRef.current.forEach(m => m.remove());
      selectedEventMarkerRef.current?.remove();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle map style & camera mode toggles
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

  // Redraw all scheduled event pins
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;
    
    allEventsMarkersRef.current.forEach(m => m.remove());
    allEventsMarkersRef.current = [];

    events.forEach(event => {
      const isSelected = selectedEvent && selectedEvent.id === event.id;
      
      const el = document.createElement('div');
      el.className = `custom-pin-container ${isSelected ? 'pin-active' : 'pin-planned'}`;
      el.innerHTML = `
        <div class="pin-marker" style="background-color: ${isSelected ? 'var(--accent-red)' : 'var(--accent-purple)'}; opacity: ${isSelected ? 1.0 : 0.8}; transform: rotate(-45deg) ${isSelected ? 'scale(1.15)' : 'scale(0.9)'}; transition: var(--transition-smooth); width: 30px; height: 30px; border-radius: 50% 50% 50% 0; display: flex; align-items: center; justify-content: center; border: 1.5px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.3); cursor: pointer;">
          <i class="fa-solid fa-calendar-check" style="color: white; font-size: 11px; transform: rotate(45deg);"></i>
        </div>
      `;
      
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map);

      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
          <div style="font-family: var(--font-sans); padding: 4px; color: var(--text-primary);">
            <strong style="color: var(--accent-purple); font-size: 13px;">${event.name}</strong><br/>
            <span style="font-size: 11px;"><strong>${t('popup-cause')}:</strong> ${translateCause(event.event_cause, activeLang)}</span><br/>
            <span style="font-size: 11px;"><strong>${t('popup-priority')}:</strong> ${translatePriority(event.priority, activeLang)}</span><br/>
            <span style="font-size: 11px;"><strong>${t('popup-start')}:</strong> ${event.start_datetime}</span><br/>
            <button 
              id="btn-select-map-${event.id}" 
              style="margin-top: 8px; width: 100%; padding: 6px 10px; background-color: var(--accent-purple); color: white; border: none; border-radius: 4px; font-size: 10px; cursor: pointer; font-weight: bold; display: block;"
            >
              ${t('popup-select-sim')}
            </button>
          </div>
        `);
        
      marker.setPopup(popup);
      
      popup.on('open', () => {
        const btn = document.getElementById(`btn-select-map-${event.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            handleSelectEvent(event);
            popup.remove();
          });
        }
      });

      allEventsMarkersRef.current.push(marker);
    });
  }, [events, selectedEvent, mapReady]);

  // Update selected incident detour path & smooth pan
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    if (selectedEventMarkerRef.current) {
      selectedEventMarkerRef.current.remove();
      selectedEventMarkerRef.current = null;
    }

    if (selectedEvent) {
      const latVal = Number(selectedEvent.latitude);
      const lonVal = Number(selectedEvent.longitude);
      
      if (Number.isFinite(latVal) && Number.isFinite(lonVal)) {
        const el = document.createElement('div');
        el.className = 'custom-pin-container pin-planned';
        el.innerHTML = `
          <div class="pin-marker" style="background-color: var(--accent-purple); width: 30px; height: 30px; border-radius: 50% 50% 50% 0; display: flex; align-items: center; justify-content: center; transform: rotate(-45deg); border: 2px solid #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-calendar-check" style="color: white; font-size: 12px; transform: rotate(45deg);"></i>
          </div>
        `;
        
        selectedEventMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([lonVal, latVal])
          .addTo(map);

        map.flyTo({
          center: [lonVal, latVal],
          zoom: is3D ? 14.5 : 13.5,
          pitch: is3D ? 55 : 0,
          bearing: is3D ? -15 : 0,
          duration: 1500,
          essential: true
        });
      }
    }
  }, [selectedEvent, mapReady, is3D]);

  // Run/Fetch propagation simulation whenever selectedEvent or timeStep changes
  const runSimulation = async (event, step) => {
    if (!event) return;
    setLoadingSim(true);
    try {
      const url = `${API_URL}/api/forecast-propagation?latitude=${event.latitude}&longitude=${event.longitude}&event_cause=${event.event_cause}&priority=${event.priority}&time_step_hours=${step}&duration_hours=${event.duration_hours}&attendance=${event.attendance || 1000}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSimulation(data);
      }
    } catch (err) {
      console.error("Error fetching propagation forecast:", err);
    } finally {
      setLoadingSim(false);
    }
  };

  useEffect(() => {
    if (!selectedEvent) {
      setSimulation(null);
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      runSimulation(selectedEvent, timeStep);
    }, 150);

    return () => clearTimeout(delayDebounceFn);
  }, [selectedEvent, timeStep]);

  // Draw H3 hexagons when simulation updates
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const geojson = buildHexagonGeoJson(simulation);
    mapRef.current.getSource('propagation-zones')?.setData(geojson);
  }, [simulation, mapReady]);

  // Handle Event selection
  function handleSelectEvent(event) {
    setSelectedEvent(event);
    setTimeStep(0);
  }

  // Submit new planned event
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lat || !lon) {
      alert("Please select coordinates on the map or enter them manually.");
      return;
    }

    const payload = {
      name,
      event_cause: cause,
      latitude: parseFloat(lat),
      longitude: parseFloat(lon),
      start_datetime: startDatetime.replace('T', ' '),
      duration_hours: parseInt(durationHours),
      attendance: parseInt(attendance),
      priority
    };

    try {
      const res = await fetch(`${API_URL}/api/planned-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newEvent = await res.json();
        await fetchEvents();
        handleSelectEvent(newEvent);
        // Reset form
        setName('');
        setLat('');
        setLon('');
        setStartDatetime('');
        setDurationHours('3');
        setAttendance('1000');
      }
    } catch (err) {
      console.error("Error creating planned event:", err);
    }
  };

  // Delete event
  const handleDelete = async (eventId, e) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to remove this planned event?")) return;
    try {
      const res = await fetch(`${API_URL}/api/planned-events/${eventId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchEvents();
        if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(null);
        }
      }
    } catch (err) {
      console.error("Error deleting event:", err);
    }
  };

  // Determine closest sourcing depot (emergency dispatch stations)
  const getSourcingDepot = (event) => {
    if (!event) return '';
    const depots = [
      { name: 'Peenya Emergency Depot', lat: 13.0305, lon: 77.5120 },
      { name: 'Yelahanka Police Station Depot', lat: 13.1008, lon: 77.5963 },
      { name: 'HAL Command Center Depot', lat: 12.9602, lon: 77.6447 }
    ];

    let closest = depots[0];
    let minDistance = Infinity;

    depots.forEach(d => {
      const dist = Math.sqrt(Math.pow(d.lat - event.latitude, 2) + Math.pow(d.lon - event.longitude, 2));
      if (dist < minDistance) {
        minDistance = dist;
        closest = d;
      }
    });

    const travelTimeMins = Math.round(minDistance * 110 * 1.5);
    return {
      name: closest.name,
      travelTime: travelTimeMins < 5 ? 5 : travelTimeMins
    };
  };

  const depotInfo = selectedEvent ? getSourcingDepot(selectedEvent) : null;

  const handleExportPDF = async () => {
    if (!selectedEvent) return;
    setExportingPDF(true);
    setPdfProgress(0);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const logoImg = new Image();
      logoImg.src = '/btp_logo.png';
      await new Promise((resolve) => {
        if (logoImg.complete) resolve();
        else {
          logoImg.onload = resolve;
          logoImg.onerror = resolve;
        }
      });

      const eventName = selectedEvent.name;
      const totalHours = parseInt(selectedEvent.duration_hours, 10);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let hour = 0; hour <= totalHours; hour++) {
        setPdfProgress(hour);
        
        const url = `${API_URL}/api/forecast-propagation?latitude=${selectedEvent.latitude}&longitude=${selectedEvent.longitude}&event_cause=${selectedEvent.event_cause}&priority=${selectedEvent.priority}&time_step_hours=${hour}&duration_hours=${selectedEvent.duration_hours}&attendance=${selectedEvent.attendance || 1000}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch forecast for Hour ${hour}`);
        const sim = await res.json();

        const eventId = selectedEvent.id;
        const eventCause = selectedEvent.event_cause.replace(/_/g, ' ').toUpperCase();
        const eventPriority = selectedEvent.priority.toUpperCase();
        const startDate = selectedEvent.start_datetime;
        const duration = selectedEvent.duration_hours;
        const attendanceVal = selectedEvent.attendance || 1000;
        const latVal = selectedEvent.latitude;
        const lonVal = selectedEvent.longitude;
        const depotName = depotInfo?.name || 'Central Command Depot';
        const travelTime = depotInfo?.travelTime || 15;
        
        const officers = sim.manpower_needed;
        const barricades = sim.barricades_needed;
        const diversionPlan = sim.diversion_sign;

        const highCongestionCount = sim.hexagons?.filter(h => h.severity >= 65).length || 0;
        const medCongestionCount = sim.hexagons?.filter(h => h.severity >= 40 && h.severity < 65).length || 0;

        const pageContainer = document.createElement('div');
        pageContainer.style.position = 'absolute';
        pageContainer.style.left = '-9999px';
        pageContainer.style.top = '-9999px';
        pageContainer.style.width = '700px';
        pageContainer.style.padding = '40px';
        pageContainer.style.backgroundColor = '#ffffff';
        pageContainer.style.color = '#0f172a';
        pageContainer.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

        pageContainer.innerHTML = `
          <div style="border-bottom: 3px double #0f172a; padding-bottom: 15px; margin-bottom: 25px; display: flex; align-items: center; justify-content: center; gap: 15px;">
            <img src="/btp_logo.png" style="width: 50px; height: 50px; object-fit: contain;" />
            <div style="text-align: left;">
              <div style="font-size: 24px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 1px; line-height: 1.1;">Bangalore City Traffic Police</div>
              <div style="font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Traffic Management & Dispatch Command</div>
            </div>
          </div>
          <div style="text-align: center; font-size: 10px; color: #94a3b8; margin-top: -18px; margin-bottom: 25px;">REPORT ID: GP-DISPATCH-${eventId} | GENERATED: ${new Date().toLocaleString()}</div>

          <div style="display: flex; justify-content: space-between; align-items: center; background-color: #0f172a; color: white; padding: 6px 15px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 20px;">
            <span>Chronological Dispatch Timeline</span>
            <span style="color: #60a5fa;">Timeline Hour: ${hour} of ${totalHours} (Phase: ${hour === 0 ? 'SETUP' : hour === totalHours ? 'DISPERSAL' : 'PEAK'})</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="border: 1px solid #e2e8f0; padding: 12px 15px; border-radius: 8px; background-color: #f8fafc;">
              <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Event Details</h4>
              <table style="width: 100%; font-size: 10.5px; border-collapse: collapse;">
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Event ID:</td><td style="padding: 3px 0; text-align: right;">${eventId}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Event Name:</td><td style="padding: 3px 0; text-align: right; font-weight: 700;">${eventName}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Event Type:</td><td style="padding: 3px 0; text-align: right;">${eventCause}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Priority Level:</td><td style="padding: 3px 0; text-align: right; font-weight: 700; color: ${eventPriority === 'HIGH' ? '#dc2626' : '#2563eb'}">${eventPriority}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Scheduled Time:</td><td style="padding: 3px 0; text-align: right;">${startDate}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Est. Duration:</td><td style="padding: 3px 0; text-align: right;">${duration} Hours</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Est. Attendance:</td><td style="padding: 3px 0; text-align: right;">${attendanceVal.toLocaleString()} attendees</td></tr>
              </table>
            </div>
            
            <div style="border: 1px solid #e2e8f0; padding: 12px 15px; border-radius: 8px; background-color: #f8fafc;">
              <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">Dispatch & Deployment</h4>
              <table style="width: 100%; font-size: 10.5px; border-collapse: collapse;">
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Location GPS:</td><td style="padding: 3px 0; text-align: right; font-family: monospace;">${latVal}, ${lonVal}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Primary Sourcing Depot:</td><td style="padding: 3px 0; text-align: right; font-weight: 700;">${depotName}</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Est. Transit Time:</td><td style="padding: 3px 0; text-align: right; font-weight: 700; color: #16a34a;">${travelTime} Minutes</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Impacted Zones:</td><td style="padding: 3px 0; text-align: right;">${sim.hexagons?.length || 0} H3 Hexagons</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">High Risk Hotspots:</td><td style="padding: 3px 0; text-align: right; font-weight: 700; color: #dc2626;">${highCongestionCount} Hexagons</td></tr>
                <tr><td style="padding: 3px 0; font-weight: bold; color: #475569;">Med Risk Zones:</td><td style="padding: 3px 0; text-align: right; font-weight: 700; color: #d97706;">${medCongestionCount} Hexagons</td></tr>
              </table>
            </div>
          </div>

          <div style="margin-bottom: 20px; border: 1.5px solid #1e3a8a; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1e3a8a; color: white; padding: 8px 15px; font-weight: 700; font-size: 12px; text-transform: uppercase; display: flex; justify-content: space-between;">
              <span>Resource Deployment Recommendations</span>
              <span>Hour ${hour}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0px; border-bottom: 1px solid #e2e8f0;">
              <div style="padding: 15px; text-align: center; border-right: 1px solid #e2e8f0; background-color: #f0fdf4;">
                <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #166534; margin-bottom: 3px;">Recommended Officers</div>
                <div style="font-size: 24px; font-weight: 800; color: #166534;">${officers}</div>
                <div style="font-size: 8.5px; color: #15803d; margin-top: 3px;">Deployed for manual gating and control</div>
              </div>
              <div style="padding: 15px; text-align: center; background-color: #fffbeb;">
                <div style="font-size: 9px; font-weight: bold; text-transform: uppercase; color: #92400e; margin-bottom: 3px;">Recommended Barricades</div>
                <div style="font-size: 24px; font-weight: 800; color: #92400e;">${barricades}</div>
                <div style="font-size: 8.5px; color: #b45309; margin-top: 3px;">Deployed for diversions and buffer rings</div>
              </div>
            </div>
          </div>

          <div style="margin-bottom: 20px; border: 1px solid #f87171; border-radius: 8px; overflow: hidden; border-left: 5px solid #ef4444;">
            <div style="background-color: #fef2f2; padding: 8px 15px; font-weight: 700; font-size: 11px; text-transform: uppercase; color: #dc2626; border-bottom: 1px solid #fee2e2;">
              Hour ${hour} - Diversion & Signage Protocol
            </div>
            <div style="padding: 12px; font-size: 11px; line-height: 1.5; color: #7f1d1d; font-weight: 600; background-color: #fef2f2;">
              ${diversionPlan}
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #1e3a8a; font-size: 11px; text-transform: uppercase;">Forecasted Congestion Impact Zones (Hour ${hour})</h4>
            <table style="width: 100%; font-size: 10.5px; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background-color: #0f172a; color: white;">
                  <th style="padding: 6px; border-bottom: 2px solid #0f172a;">H3 Index</th>
                  <th style="padding: 6px; border-bottom: 2px solid #0f172a;">Risk Level</th>
                  <th style="padding: 6px; border-bottom: 2px solid #0f172a;">Congestion Index</th>
                  <th style="padding: 6px; border-bottom: 2px solid #0f172a;">Distance Category</th>
                </tr>
              </thead>
              <tbody>
                ${sim.hexagons?.slice(0, 5).map((hex, i) => {
                  const risk = hex.severity >= 65 ? 'CRITICAL' : hex.severity >= 40 ? 'MEDIUM' : 'LOW';
                  const riskColor = hex.severity >= 65 ? '#dc2626' : hex.severity >= 40 ? '#d97706' : '#2563eb';
                  return `
                    <tr style="background-color: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 6px; font-family: monospace;">${hex.h3_index}</td>
                      <td style="padding: 6px; font-weight: bold; color: ${riskColor};">${risk}</td>
                      <td style="padding: 6px;">${hex.severity.toFixed(1)}%</td>
                      <td style="padding: 6px;">${hex.ring === 0 ? 'Epicenter' : `Ring ${hex.ring}`}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            ${sim.hexagons?.length > 5 ? `<div style="font-size: 9px; color: #64748b; margin-top: 4px; font-style: italic;">* Showing top 5 critical zones out of ${sim.hexagons.length} total impacted zones.</div>` : ''}
          </div>

          <div style="margin-top: 30px; display: flex; justify-content: space-between; font-size: 10px; color: #475569;">
            <div>
              <div style="border-top: 1px solid #94a3b8; width: 160px; margin-top: 30px; padding-top: 4px; text-align: center; font-weight: 700;">Central Command Sign-Off</div>
            </div>
            <div>
              <div style="border-top: 1px solid #94a3b8; width: 160px; margin-top: 30px; padding-top: 4px; text-align: center; font-weight: 700;">Field Dispatch Officer</div>
            </div>
          </div>
        `;

        document.body.appendChild(pageContainer);

        const canvas = await html2canvas(pageContainer, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/png');
        const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
        const width = canvas.width * ratio;
        const height = canvas.height * ratio;

        if (hour > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, width, height);
        document.body.removeChild(pageContainer);
      }

      pdf.save(`CompleteDispatchTimeline_${eventName.replace(/\s+/g, '_')}.pdf`);

    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF: " + err.message);
    } finally {
      setExportingPDF(false);
    }
  };

  return (
    <div className="dashboard-body">
      
      {/* Top statistics overview bar */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-title">{t('events-list-title')}</div>
          <div className="stat-value">{events.length}</div>
          <Calendar className="card-icon" style={{ color: 'var(--accent-purple)' }} />
        </div>
        <div className="stat-card">
          <div className="stat-title">{t('stat-peak-severity-lbl')}</div>
          <div className="stat-value">
            {simulation ? `${(simulation.current_base_severity).toFixed(0)}%` : '0%'}
          </div>
          <Shield className="card-icon text-red" />
        </div>
        <div className="stat-card">
          <div className="stat-title">{t('stat-manpower-lbl')}</div>
          <div className="stat-value">
            {simulation ? simulation.manpower_needed : 0}
          </div>
          <Shield className="card-icon text-blue" />
        </div>
        <div className="stat-card">
          <div className="stat-title">{t('stat-barricades-lbl')}</div>
          <div className="stat-value">
            {simulation ? simulation.barricades_needed : 0}
          </div>
          <Construction className="card-icon text-yellow" />
        </div>
      </div>

      {/* Main planner board */}
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px' }}>
        
        {/* Left Side: Schedule Form & Scheduled Events list */}
        <aside className="details-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', height: 'fit-content' }}>
          
          {/* Scheduling form */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={16} style={{ color: 'var(--accent-purple)' }} />
              <span>{t('planner-title')}</span>
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              
              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('event-name-lbl')}</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder={t('placeholder-rally') || 'e.g. Political Rally'} 
                  required 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('lat-lbl')}</label>
                  <input 
                    type="number" 
                    step="0.000001" 
                    value={lat} 
                    onChange={e => setLat(e.target.value)} 
                    placeholder="12.978" 
                    required 
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('lon-lbl')}</label>
                  <input 
                    type="number" 
                    step="0.000001" 
                    value={lon} 
                    onChange={e => setLon(e.target.value)} 
                    placeholder="77.594" 
                    required 
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('cause-lbl')}</label>
                  <select value={cause} onChange={e => setCause(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}>
                    <option value="public_event">{t('cause-publicevent')}</option>
                    <option value="construction">{t('cause-construction')}</option>
                    <option value="congestion">{t('cause-congestion')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('priority-lbl')}</label>
                  <select value={priority} onChange={e => setPriority(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}>
                    <option value="High">{t('priority-high')}</option>
                    <option value="Medium">{t('priority-medium')}</option>
                    <option value="Low">{t('priority-low')}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('event-start-lbl')}</label>
                <input 
                  type="datetime-local" 
                  value={startDatetime} 
                  onChange={e => setStartDatetime(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('event-duration-lbl')}</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="24" 
                    value={durationHours} 
                    onChange={e => setDurationHours(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>{t('event-attendance-lbl')}</label>
                  <input 
                    type="number" 
                    min="100" 
                    value={attendance} 
                    onChange={e => setAttendance(e.target.value)} 
                    required 
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '12px' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-preset" 
                style={{ backgroundColor: 'var(--accent-purple)', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '6px', fontWeight: '800', width: '100%', marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Play size={14} />
                <span>{t('btn-schedule-event')}</span>
              </button>
            </form>
          </div>

          {/* List of Scheduled events */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '8px' }}>
              {t('events-list-title')} ({events.length})
            </h3>
            
            <div style={{ overflowY: 'auto', flexGrow: 1, maxHeight: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {events.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', margin: 'auto' }}>
                  {t('no-events-scheduled')}
                </p>
              ) : (
                events.map(event => {
                  const isSel = selectedEvent && selectedEvent.id === event.id;
                  return (
                    <div 
                      key={event.id} 
                      onClick={() => handleSelectEvent(event)}
                      className={`feed-item`}
                      style={{ 
                        cursor: 'pointer',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        backgroundColor: isSel ? 'rgba(79, 70, 229, 0.05)' : 'var(--bg-secondary)',
                        borderColor: isSel ? 'var(--accent-purple)' : 'var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>{event.id}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ backgroundColor: 'rgba(79, 70, 229, 0.08)', color: 'var(--accent-purple)', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: '800' }}>{activeLang === 'kn' ? 'ಪ್ರಭಾವ' : activeLang === 'hi' ? 'प्रभाव' : 'Impact'}: {calculateImpactScore(event)}/100</span>
                          <span className={`badge badge-${event.priority.toLowerCase()}`} style={{ fontSize: '9px' }}>{translatePriority(event.priority, activeLang)}</span>
                          <button 
                            onClick={(e) => handleDelete(event.id, e)}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>{event.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        <span>{event.start_datetime} ({event.duration_hours}h)</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: Map, Timeline Slider, Resource Planner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Map Container */}
          <div className="details-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative', overflow: 'hidden' }}>
            <div ref={mapContainerRef} style={{ height: '400px', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}></div>
            
            

            {(!MAPTILER_KEY || mapUnavailable) && (
              <div style={{
                position: 'absolute',
                top: '12px', left: '12px', right: '12px', height: '400px',
                background: 'rgba(15, 23, 42, 0.95)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                padding: '24px',
                textAlign: 'center',
                zIndex: 10,
                borderRadius: '8px'
              }}>
                <MapPin size={32} style={{ color: '#ef4444', marginBottom: '12px' }} />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 'bold' }}>MapTiler API Key Missing</h4>
                <p style={{ margin: '6px 0 0', fontSize: '11px', opacity: 0.8, maxWidth: '380px', lineHeight: '1.4' }}>
                  To render the real-world 3D map of Bengaluru city, please sign up for a free MapTiler account (no credit card required) and add <code>VITE_MAPTILER_KEY="your_key"</code> in your <code>.env</code> file.
                </p>
              </div>
            )}
            
            {/* Timeline Simulation Slider */}
            {selectedEvent ? (
              <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} className="pulse-icon" style={{ color: 'var(--accent-purple)' }} />
                    <span>{t('time-step-lbl')}</span>
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--accent-purple)' }}>
                    {activeLang === 'kn' ? `${selectedEvent.duration_hours} ಗಂಟೆಗಳಲ್ಲಿ ${timeStep} ನೇ ಗಂಟೆ` : activeLang === 'hi' ? `${selectedEvent.duration_hours} घंटों में से घंटा ${timeStep}` : `Hour ${timeStep} of ${selectedEvent.duration_hours} hours`}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max={selectedEvent.duration_hours} 
                    value={timeStep} 
                    onChange={e => setTimeStep(parseInt(e.target.value))}
                    style={{ 
                      flexGrow: 1, 
                      height: '6px', 
                      borderRadius: '3px', 
                      outline: 'none', 
                      accentColor: 'var(--accent-purple)',
                      cursor: 'pointer' 
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px' }}>
                  <span>{activeLang === 'kn' ? 'ಪ್ರಾರಂಭ (ಗಂಟೆ 0)' : activeLang === 'hi' ? 'प्रारंभ (घंटा 0)' : 'START (Hour 0)'}</span>
                  <span>{activeLang === 'kn' ? `ಮಧ್ಯಬಿಂದು (ಗಂಟೆ ${Math.round(selectedEvent.duration_hours / 2)})` : activeLang === 'hi' ? `मध्य बिंदु (घंटा ${Math.round(selectedEvent.duration_hours / 2)})` : `MIDPOINT (Hour ${Math.round(selectedEvent.duration_hours / 2)})`}</span>
                  <span>{activeLang === 'kn' ? `ಚದುರುವಿಕೆ (ಗಂಟೆ ${selectedEvent.duration_hours})` : activeLang === 'hi' ? `समाप्ति (घंटा ${selectedEvent.duration_hours})` : `DISPERSAL (Hour ${selectedEvent.duration_hours})`}</span>
                </div>

                 {/* Selected Event Details Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(5, 1fr)', 
                  gap: '8px', 
                  marginTop: '6px', 
                  paddingTop: '10px', 
                  borderTop: '1px solid var(--border-color)' 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('cause-lbl') || 'Cause'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {translateCause(selectedEvent.event_cause, activeLang)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeLang === 'kn' ? 'ಹಾಜರಾತಿ' : activeLang === 'hi' ? 'उपस्थिति' : 'Attendance'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-blue)' }}>
                      {selectedEvent.attendance.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeLang === 'kn' ? 'ಘಟನೆ ಪ್ರಭಾವ' : activeLang === 'hi' ? 'घटना प्रभाव' : 'Event Impact'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-purple)' }}>
                      {calculateImpactScore(selectedEvent)}/100
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeLang === 'kn' ? 'AI ವಿಶ್ವಾಸಾರ್ಹತೆ' : activeLang === 'hi' ? 'एआई आत्मविश्वास' : 'AI Confidence'}</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--accent-green)' }}>
                      {simulation ? (96.8 - (simulation.current_base_severity || 40) * 0.04 - (selectedEvent.attendance > 5000 ? 2.5 : 0)).toFixed(1) : '94.2'}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t('priority-lbl') || 'Priority'}</span>
                    <span className={`badge badge-${selectedEvent.priority.toLowerCase()}`} style={{ fontSize: '9px', width: 'fit-content', padding: '1px 6px' }}>
                      {translatePriority(selectedEvent.priority, activeLang)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px' }}>
                {t('planner-sidebar-instruction')}
              </div>
            )}
          </div>

          {/* Sourcing Resource and Depot recommendations */}
          <AnimatePresence mode="wait">
            {selectedEvent && simulation && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}
              >
                
                {/* Resource mitigation recommendations */}
                <div className="details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                      <Shield size={16} style={{ color: 'var(--accent-purple)' }} />
                      <span>{activeLang === 'kn' ? `AI ಸಂಪನ್ಮೂಲ ಆಪ್ಟಿಮೈಸೇಶನ್ (ಗಂಟೆ ${timeStep})` : activeLang === 'hi' ? `एआई संसाधन अनुकूलन (घंटा ${timeStep})` : `AI Resource Optimization (Hour ${timeStep})`}</span>
                    </h3>
                    <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--accent-green)' }}>{activeLang === 'kn' ? 'ಬಳಕೆಯನ್ನು 45% ರಷ್ಟು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ' : activeLang === 'hi' ? 'अपव्यय को 45% कम करता है' : 'REDUCES WASTE BY 45%'}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
                    
                    {/* AI Optimized Plan */}
                    <div style={{ padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', borderLeft: '4px solid var(--accent-blue)' }}>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--accent-blue)', textTransform: 'uppercase' }}>{activeLang === 'kn' ? 'AI ಅತ್ಯುತ್ತಮ ಯೋಜನೆ' : activeLang === 'hi' ? 'एआई अनुकूलित योजना' : 'AI Optimized Plan'}</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--accent-blue)' }}>{simulation.manpower_needed}</div>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{t('rec-officers-lbl')}</span>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--accent-yellow)' }}>{simulation.barricades_needed}</div>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{t('rec-barricades-lbl')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Manual SOP Plan */}
                    <div style={{ padding: '10px', background: 'rgba(15, 23, 42, 0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{activeLang === 'kn' ? 'ಹಸ್ತಚಾಲಿತ ಪೊಲೀಸ್ SOP' : activeLang === 'hi' ? 'मैनुअल पुलिस एसओपी' : 'Manual Police SOP'}</span>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-muted)' }}>
                            {selectedEvent.priority === 'High' ? 16 : selectedEvent.priority === 'Medium' ? 10 : 6}
                          </div>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{t('rec-officers-lbl')}</span>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-muted)' }}>
                            {selectedEvent.priority === 'High' ? 24 : selectedEvent.priority === 'Medium' ? 16 : 8}
                          </div>
                          <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{t('rec-barricades-lbl')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corridor Diversion & Sign Warning */}
                  <div style={{ padding: '10px', backgroundColor: 'rgba(22, 163, 74, 0.03)', border: '1px solid rgba(22, 163, 74, 0.15)', borderRadius: '8px', borderLeft: '4px solid var(--accent-green)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '8px', fontWeight: '800', color: 'var(--accent-green)' }}>
                        {activeLang === 'kn' ? 'ಕಾರಿಡಾರ್' : activeLang === 'hi' ? 'गलियारा' : 'CORRIDOR'}: {(() => {
                          if (selectedEvent.latitude > 13.08) return activeLang === 'kn' ? 'ಬಳ್ಳಾರಿ ರಸ್ತೆ ಎಕ್ಸ್‌ಪ್ರೆಸ್‌ವೇ' : activeLang === 'hi' ? 'बेलारी रोड एक्सप्रेसवे' : "Bellary Road Expressway";
                          if (selectedEvent.latitude < 12.98) return activeLang === 'kn' ? 'ಎಚ್‌ಎಎಲ್ ಹಳೇ ವಿಮಾನ ನಿಲ್ದಾಣ ರಸ್ತೆ ಕಾರಿಡಾರ್' : activeLang === 'hi' ? 'एचएएल ओल्ड एयरपोर्ट रोड कॉरिडोर' : "HAL Old Airport Road Corridor";
                          if (selectedEvent.longitude < 77.53) return activeLang === 'kn' ? 'ತುಮಕೂರು ರಸ್ತೆ ಕಾರಿಡಾರ್' : activeLang === 'hi' ? 'तुमकुर रोड कॉरिडोर' : "Tumkur Road Corridor";
                          return activeLang === 'kn' ? 'ಬೆಂಗಳೂರು ಕೇಂದ್ರ ಅಪಧಮನಿ ರಸ್ತೆ' : activeLang === 'hi' ? 'बेंगलुरु सेंट्रल आर्टेरियल लिंक' : "Bengaluru Central Arterial Link";
                        })()}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: '800', color: 'var(--accent-green)' }}>
                        {selectedEvent.latitude > 13.08 
                          ? (activeLang === 'kn' ? '▼ 28% ವಿಳಂಬ ಪರಿಹಾರ' : activeLang === 'hi' ? '▼ 28% देरी से राहत' : "▼ 28% Delay Relief") 
                          : selectedEvent.latitude < 12.98 
                          ? (activeLang === 'kn' ? '▼ 22% ವಿಳಂಬ ಪರಿಹಾರ' : activeLang === 'hi' ? '▼ 22% देरी से राहत' : "▼ 22% Delay Relief") 
                          : selectedEvent.longitude < 77.53 
                          ? (activeLang === 'kn' ? '▼ 24% ವಿಳಂಬ ಪರಿಹಾರ' : activeLang === 'hi' ? '▼ 24% देरी से राहत' : "▼ 24% Delay Relief") 
                          : (activeLang === 'kn' ? '▼ 18% ವಿಳಂಬ ಪರಿಹಾರ' : activeLang === 'hi' ? '▼ 18% देरी से राहत' : "▼ 18% Delay Relief")}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                      {(() => {
                        if (selectedEvent.latitude > 13.08) return activeLang === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಬದಲಿ ಮಾರ್ಗ: ಯಲಹಂಕ ಹಳೇ ಪೇಟೆ ಬೈಪಾಸ್ ಮತ್ತು ಸೆಂಟ್ರಲ್ ಅವೆನ್ಯೂ' : activeLang === 'hi' ? 'अनुशंसित मार्ग परिवर्तन: यलहंका ओल्ड टाउन बाईपास और सेंट्रल एवेन्यू' : "Recommended Detour: Yelahanka Old Town Bypass & Central Ave";
                        if (selectedEvent.latitude < 12.98) return activeLang === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಬದಲಿ ಮಾರ್ಗ: ಎಚ್‌ಎಎಲ್ ವಿಂಡ್ ಟನಲ್ ರಸ್ತೆ ಮತ್ತು ಹೊರ ವರ್ತುಲ ರಸ್ತೆ' : activeLang === 'hi' ? 'अनुशंसित मार्ग परिवर्तन: एचएएल विंड टनल रोड और आउटर रिंग रोड' : "Recommended Detour: HAL Wind Tunnel Road & Outer Ring Road";
                        if (selectedEvent.longitude < 77.53) return activeLang === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಬದಲಿ ಮಾರ್ಗ: ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ಮತ್ತು ಪೀಣ್ಯ ಕೈಗಾರಿಕಾ ಬೈಪಾಸ್' : activeLang === 'hi' ? 'अनुशंसित मार्ग परिवर्तन: आउटर रिंग रोड और पीण्या औद्योगिक बाईपास' : "Recommended Detour: Outer Ring Road & Peenya Industrial Bypass";
                        return activeLang === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಬದಲಿ ಮಾರ್ಗ: ಅಡಚಣೆಯನ್ನು ತಪ್ಪಿಸಲು ಸಮಾನಾಂತರ ದ್ವಿತೀಯ ರಸ್ತೆಗಳು' : activeLang === 'hi' ? 'अनुशंसित मार्ग परिवर्तन: ब्लॉक को बायपास करने के लिए समानांतर माध्यमिक मार्ग' : "Recommended Detour: Parallel secondary network lanes to bypass block";
                      })()}
                    </span>
                    <div style={{ marginTop: '4px', padding: '6px', background: '#000000', border: '1px solid #d97706', borderRadius: '4px', color: '#f59e0b', fontFamily: 'monospace', fontSize: '9px', textTransform: 'uppercase' }}>
                      {activeLang === 'kn' ? '⚠️ ಎಲ್ಇಡಿ ವಿಎಂಎಸ್ ಚಿಹ್ನೆ:' : activeLang === 'hi' ? '⚠️ एलईडी वीएमएस संकेत:' : '⚠️ LED VMS Sign:'} {translateDiversionSign(simulation.diversion_sign, activeLang)}
                    </div>
                  </div>
                </div>

                {/* Sourcing Depot Allocation */}
                <div className="details-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building size={16} style={{ color: 'var(--accent-purple)' }} />
                      <span>{activeLang === 'kn' ? 'ಸಂಪನ್ಮೂಲ ಮೂಲಗಳು ಮತ್ತು ಡಿಪೋಗಳು' : activeLang === 'hi' ? 'संसाधन सोर्सिंग और डिपो' : 'Resource Sourcing & Depots'}</span>
                    </div>
                    <button 
                      onClick={handleExportPDF}
                      disabled={exportingPDF}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        padding: '6px 12px', 
                        backgroundColor: exportingPDF ? 'var(--text-muted)' : 'var(--accent-green)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        cursor: exportingPDF ? 'not-allowed' : 'pointer',
                        transition: 'var(--transition-smooth)'
                      }}
                    >
                      <Download size={12} />
                      <span>{exportingPDF 
                        ? (activeLang === 'kn' ? `ರಫ್ತು ಮಾಡಲಾಗುತ್ತಿದೆ H${pdfProgress}...` : activeLang === 'hi' ? `निर्यात किया जा रहा है H${pdfProgress}...` : `Exporting H${pdfProgress}...`) 
                        : (activeLang === 'kn' ? 'ಯೋಜನೆಯನ್ನು ರಫ್ತು ಮಾಡಿ (PDF)' : activeLang === 'hi' ? 'योजना निर्यात करें (PDF)' : 'Export Plan (PDF)')}</span>
                    </button>
                  </h3>
                  
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-purple)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{t('planner-source-depot').toUpperCase()}</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{depotInfo?.name}</span>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)', borderLeft: '4px solid var(--accent-green)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>{t('planner-travel-time').toUpperCase()}</span>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Navigation size={14} className="pulse-icon" style={{ color: 'var(--accent-green)' }} />
                      <span>{activeLang === 'kn' ? `ಘಟನಾ ಸ್ಥಳಕ್ಕೆ ತಲುಪಲು ${depotInfo?.travelTime} ನಿಮಿಷಗಳು` : activeLang === 'hi' ? `घटना स्थल तक पहुँचने में ${depotInfo?.travelTime} मिनट` : `${depotInfo?.travelTime} minutes to event site`}</span>
                    </span>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
