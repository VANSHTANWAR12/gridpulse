import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Siren, Activity, Shield, Flame, MapPin, Navigation, Clock, Zap, Target, PlayCircle, BarChart3, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { findNearestHospital, findNearestFireStation, findNearestPoliceStation, getHaversineDistance, generateCircle } from '../utils/geoUtils';
import EmergencyInfrastructureLayer from './EmergencyInfrastructureLayer';
import { getApiUrl } from '../api';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
const BENGALURU_CENTER = [77.5946, 12.9785];

const getPriorityColor = (priority) => {
  if (priority === 'High') return '#ef4444';
  if (priority === 'Medium') return '#f59e0b';
  return '#3b82f6';
};

export default function EmergencyCorridorCenter({ activeIncidents, selectedIncident, setSelectedIncident, fetchData, is3D, activeLang, t }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  
  const [mapReady, setMapReady] = useState(false);
  const [nodesData, setNodesData] = useState([]);
  
  // Dashboard Map Elements
  const [hotspots, setHotspots] = useState([]);
  const incidentMarkersRef = useRef([]);
  
  // Simulation State
  const [vehicleType, setVehicleType] = useState('ambulance');
  const [priorityLevel, setPriorityLevel] = useState('P1 Critical');
  const [incidentCoords, setIncidentCoords] = useState(null);
  
  const [sourceNode, setSourceNode] = useState(null);
  const [destNode, setDestNode] = useState(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0); 
  const simulationStepRef = useRef(0);
  
  const [metrics, setMetrics] = useState({
    originalEta: '--',
    optimizedEta: '--',
    timeSaved: '--',
    distance: '--',
    signalsMod: 0,
    fuelSaved: '--'
  });

  const targetIncidentMarkerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);

  // Sync ref
  useEffect(() => {
    simulationStepRef.current = simulationStep;
  }, [simulationStep]);

  // Fetch hotspots
  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const res = await fetch(getApiUrl('/api/hotspots'));
        if (res.ok) {
          const data = await res.json();
          setHotspots(data);
        }
      } catch (err) {
        console.error("Error fetching hotspots:", err);
      }
    };
    fetchHotspots();
  }, []);

  // Init Map
  useEffect(() => {
    if (!MAPTILER_KEY || !mapContainerRef.current || mapRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`,
        center: BENGALURU_CENTER,
        zoom: 13,
        pitch: is3D ? 55 : 0,
        bearing: 0,
        antialias: true
      });

      mapRef.current = map;

      map.on('load', () => {
        setMapReady(true);
        
        // Add hotspot layer
        map.addSource('hotspot-zones', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        map.addLayer({
          id: 'hotspot-fill',
          type: 'fill',
          source: 'hotspot-zones',
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.15
          }
        });
        
        // Add standard route layer (Least Optimized)
        map.addSource('standard-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        map.addLayer({
          id: 'standard-route-line',
          type: 'line',
          source: 'standard-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#ef4444',
            'line-width': 4,
            'line-dasharray': [2, 2],
            'line-opacity': 0.7
          }
        });
        
        // Add route layer
        map.addSource('emergency-route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        map.addLayer({
          id: 'emergency-route-line',
          type: 'line',
          source: 'emergency-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#f59e0b', // Initially yellow/orange to indicate proposed
            'line-width': 6,
            'line-opacity': 0.8,
            'line-dasharray': [2, 2]
          }
        });
        
        // Add congestion buffer
        map.addSource('congestion-buffer', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
        
        map.addLayer({
          id: 'congestion-buffer-fill',
          type: 'fill',
          source: 'congestion-buffer',
          paint: {
            'fill-color': '#f59e0b',
            'fill-opacity': 0.2
          }
        });
      });

      map.on('click', (e) => {
        if (simulationStepRef.current > 0 && simulationStepRef.current < 4) return; // Don't interrupt running sim
        setIncidentCoords([e.lngLat.lng, e.lngLat.lat]);
      });

    } catch (err) {
      console.error("Map load error:", err);
    }
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync Hotspots to map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    try {
      const hotspotsGeoJson = {
        type: 'FeatureCollection',
        features: hotspots.map((h, i) => ({
          type: 'Feature',
          id: i,
          geometry: {
            type: 'Polygon',
            coordinates: h.coordinates
          },
          properties: {
            intensity: h.intensity
          }
        }))
      };
      const source = mapRef.current.getSource('hotspot-zones');
      if (source) source.setData(hotspotsGeoJson);
    } catch(e) {
      console.error('Error drawing hotspots', e);
    }
  }, [hotspots, mapReady]);

  // Sync Incidents to map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    
    try {
      incidentMarkersRef.current.forEach(m => m.remove());
      incidentMarkersRef.current = [];
      
      if (activeIncidents && activeIncidents.length) {
        activeIncidents.forEach(inc => {
          if (!inc.lat || !inc.lon) return;
          
          const el = document.createElement('div');
          el.className = 'erc-active-incident-marker';
          el.style.width = '16px';
          el.style.height = '16px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = getPriorityColor(inc.priority);
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
          
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([inc.lon, inc.lat])
            .addTo(mapRef.current);
            
          incidentMarkersRef.current.push(marker);
        });
      }
    } catch (err) {
      console.error('Error rendering active incidents', err);
    }
  }, [activeIncidents, mapReady]);

  // Update map style when is3D changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const style = is3D 
      ? `https://api.maptiler.com/maps/hybrid/style.json?key=${MAPTILER_KEY}`
      : `https://api.maptiler.com/maps/dataviz-light/style.json?key=${MAPTILER_KEY}`;
    mapRef.current.setStyle(style);
    mapRef.current.easeTo({ pitch: is3D ? 55 : 0 });
  }, [is3D, mapReady]);

  // Handle Incident Selection & Nodes finding
  useEffect(() => {
    if (!incidentCoords || !nodesData || !nodesData.length) return;
    
    try {
      if (targetIncidentMarkerRef.current) {
        targetIncidentMarkerRef.current.remove();
        targetIncidentMarkerRef.current = null;
      }
      
      if (vehicleMarkerRef.current) {
         vehicleMarkerRef.current.remove();
         vehicleMarkerRef.current = null;
      }
      
      const el = document.createElement('div');
      el.className = 'erc-incident-marker';
      el.innerHTML = `<div class="erc-pulse-ring"></div><i class="fa-solid fa-triangle-exclamation" style="color:white; font-size: 14px;"></i>`;
      
      targetIncidentMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat(incidentCoords)
        .addTo(mapRef.current);
        
      let source = null;
      let dest = null;
      
      const lat = incidentCoords[1];
      const lng = incidentCoords[0];
      
      // NEW LOGIC: Vehicle starts at the critical location (Incident) and goes to Nearest Center.
      source = { lat, lng, name: 'Critical Incident Location', type: 'incident' };
      
      if (vehicleType === 'ambulance') {
        dest = findNearestHospital(lat, lng, nodesData);
      } else if (vehicleType === 'fire_truck') {
        dest = findNearestFireStation(lat, lng, nodesData);
      } else {
        dest = findNearestPoliceStation(lat, lng, nodesData);
      }
      
      if (source && dest) {
         setSourceNode(source);
         setDestNode(dest);
         fetchAndHighlightPath(source, dest);
      }
      
    } catch (e) {
      console.error("Error handling incident coords", e);
    }
  }, [incidentCoords, vehicleType, nodesData, mapReady]);

  // Propose path automatically
  const fetchAndHighlightPath = async (src, dst) => {
    try {
      setSimulationStep(0);
      setApprovalNeeded(false);
      
      // Reset map layers
      if (mapReady && mapRef.current) {
        const routeSrc = mapRef.current.getSource('emergency-route');
        if (routeSrc) routeSrc.setData({ type: 'FeatureCollection', features: [] });
        
        const standardRouteSrc = mapRef.current.getSource('standard-route');
        if (standardRouteSrc) standardRouteSrc.setData({ type: 'FeatureCollection', features: [] });
        
        const bufSrc = mapRef.current.getSource('congestion-buffer');
        if (bufSrc) bufSrc.setData({ type: 'FeatureCollection', features: [] });
      }

      // 1. Fetch Standard Path (Direct)
      const resStandard = await fetch(`https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${dst.lng},${dst.lat}?overview=full&geometries=geojson`);
      const dataStandard = await resStandard.json();
      if (dataStandard.code !== 'Ok') throw new Error("Standard routing failed");
      
      const standardRoute = dataStandard.routes[0];
      const coords = standardRoute.geometry.coordinates;
      
      // Find midpoint of standard route to place a simulated problem
      const midPointIndex = Math.floor(coords.length / 2);
      const problemPoint = coords[midPointIndex];
      
      // Draw congestion buffer exactly on the problem point
      if (mapReady) {
        const bufferGeo = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [generateCircle(problemPoint, 0.8)] // 800m congestion radius
            }
          }]
        };
        const bufSrc = mapRef.current.getSource('congestion-buffer');
        if (bufSrc) bufSrc.setData(bufferGeo);
      }

      // 2. Fetch Optimized Path (Detour)
      // We calculate a perpendicular shift to bypass the problem point
      const dx = dst.lng - src.lng;
      const dy = dst.lat - src.lat;
      const length = Math.sqrt(dx*dx + dy*dy);
      // Perpendicular vector
      const px = -dy / length;
      const py = dx / length;
      
      // Shift magnitude (~1.5 km depending on latitude)
      const shiftMag = 0.015;
      const detourLng = problemPoint[0] + px * shiftMag;
      const detourLat = problemPoint[1] + py * shiftMag;

      const resOpt = await fetch(`https://router.project-osrm.org/route/v1/driving/${src.lng},${src.lat};${detourLng},${detourLat};${dst.lng},${dst.lat}?overview=full&geometries=geojson`);
      const dataOpt = await resOpt.json();
      if (dataOpt.code !== 'Ok') throw new Error("Optimized routing failed");
      
      const optRoute = dataOpt.routes[0];
      
      const optDist = (optRoute.distance / 1000).toFixed(1);
      
      // Standard ETA gets huge penalty for going through congestion
      const origEta = Math.round(standardRoute.duration / 60) + 15; 
      // Optimized ETA is faster due to green corridor bypassing the congestion
      const optEta = Math.round(optRoute.duration / 60) * 0.45; 
      
      setMetrics({
        originalEta: origEta,
        optimizedEta: Math.round(optEta),
        timeSaved: origEta - Math.round(optEta),
        distance: optDist,
        signalsMod: Math.floor(optRoute.distance / 800),
        fuelSaved: ((origEta - optEta) * 0.05).toFixed(1)
      });
      
      setRouteGeoJSON(optRoute.geometry);
      
      if (mapReady) {
        // Draw standard route (Red, Dashed)
        const stdSrc = mapRef.current.getSource('standard-route');
        if (stdSrc) stdSrc.setData(standardRoute.geometry);
        
        // Draw optimized route (Green, Dashed initially)
        mapRef.current.setPaintProperty('emergency-route-line', 'line-color', '#10b981');
        mapRef.current.setPaintProperty('emergency-route-line', 'line-dasharray', [2, 2]);
        const optSrc = mapRef.current.getSource('emergency-route');
        if (optSrc) optSrc.setData(optRoute.geometry);
        
        const bounds = new maplibregl.LngLatBounds();
        optRoute.geometry.coordinates.forEach(c => bounds.extend(c));
        standardRoute.geometry.coordinates.forEach(c => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 50 });
      }
      
      setSimulationStep(1); // Path Proposed
      setApprovalNeeded(true);
      
    } catch (err) {
      console.error("Path highlighting error:", err);
    }
  };

  // Run Simulation workflow after approval
  const approveAndRunSimulation = async () => {
    if (!routeGeoJSON) return;
    
    setApprovalNeeded(false);
    
    try {
      // Step 2: Signals Optimized
      setSimulationStep(2);
      
      if (mapReady && mapRef.current) {
        // Change route style to solid green corridor
        mapRef.current.setPaintProperty('emergency-route-line', 'line-color', '#10b981');
        mapRef.current.setPaintProperty('emergency-route-line', 'line-dasharray', [1, 0]);
      }
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Step 3: Corridor Activated
      setSimulationStep(3);
      await new Promise(r => setTimeout(r, 1000));
      
      // Step 4: Progress (Vehicle movement animation)
      setSimulationStep(4);
      animateVehicle(routeGeoJSON.coordinates);
      
    } catch (err) {
      console.error("Simulation error:", err);
      setSimulationStep(0);
    }
  };
  
  const animateVehicle = (path) => {
    if (!mapRef.current) return;
    
    if (vehicleMarkerRef.current) vehicleMarkerRef.current.remove();
    
    const el = document.createElement('div');
    el.className = `erc-vehicle-marker erc-vehicle-${vehicleType}`;
    el.innerHTML = `<i class="fa-solid fa-truck-medical" style="color:white; font-size: 14px;"></i>`;
    
    vehicleMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(path[0])
      .addTo(mapRef.current);
      
    let step = 0;
    
    // Slow down animation based on path length so it's visible
    // For a typical path of 100-300 points, incrementing by 0.2 to 0.5 makes it slow and smooth.
    const stepIncrement = Math.max(0.1, path.length / 400); 

    const animate = () => {
      if (!mapRef.current || !vehicleMarkerRef.current) return;
      if (Math.floor(step) >= path.length) {
        setSimulationStep(5); // Done
        return;
      }
      
      // Get exact coordinate index
      const currentIndex = Math.floor(step);
      vehicleMarkerRef.current.setLngLat(path[currentIndex]);
      
      step += stepIncrement;
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  };

  return (
    <div className="erc-container">
      <div className="erc-map-wrapper">
        <div ref={mapContainerRef} className="erc-map-canvas" />
        
        <EmergencyInfrastructureLayer 
          mapReady={mapReady} 
          mapRef={mapRef} 
          onNodesLoaded={setNodesData} 
        />
        
        {simulationStep > 0 && (
          <div className="erc-sim-overlay">
            <div className="erc-sim-header">
              <Siren className="erc-spin" color="#ef4444" size={20} />
              <h3>EMERGENCY CORRIDOR</h3>
            </div>
            
            <div className="erc-sim-steps">
              {['Proposed', 'Signals', 'Corridor', 'Progress', 'Done'].map((step, idx) => (
                <div key={idx} className={`erc-step ${simulationStep > idx + 1 ? 'completed' : simulationStep === idx + 1 ? 'active' : ''}`}>
                  <div className="erc-step-dot"></div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="erc-controls-wrapper">
        <div className="erc-panel-header">
          <Zap size={18} color="#10b981" />
          <h2>Emergency Response Center</h2>
        </div>

        <div className="erc-scroll-content">
          
          <div className="erc-card">
            <h3>Vehicle Simulator</h3>
            <p className="erc-text-muted">Click on map to mark critical location</p>
            
            <div className="erc-form-group">
              <label>Vehicle Type</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="erc-input">
                <option value="ambulance">🚑 Ambulance</option>
                <option value="fire_truck">🚒 Fire Engine</option>
                <option value="police">🚓 Police Interceptor</option>
              </select>
            </div>
            
            <div className="erc-form-group">
              <label>Priority Level</label>
              <select value={priorityLevel} onChange={e => setPriorityLevel(e.target.value)} className="erc-input">
                <option value="P1 Critical">P1 - CRITICAL (Life Threatening)</option>
                <option value="P2 High">P2 - HIGH (Urgent Response)</option>
                <option value="P3 Standard">P3 - STANDARD</option>
              </select>
            </div>
            
            <div className="erc-routing-info">
              <div className="erc-route-node">
                <div className="erc-node-icon start"><AlertCircle size={12}/></div>
                <div>
                  <span className="erc-node-label">Start (Incident)</span>
                  <div className="erc-node-val">{sourceNode ? sourceNode.name : 'Waiting for incident...'}</div>
                </div>
              </div>
              <div className="erc-route-line"></div>
              <div className="erc-route-node">
                <div className="erc-node-icon dest"><Target size={12}/></div>
                <div>
                  <span className="erc-node-label">Nearest Center</span>
                  <div className="erc-node-val">{destNode ? destNode.name : 'Waiting for incident...'}</div>
                </div>
              </div>
            </div>

            <button 
              className={`erc-btn-primary ${(!approvalNeeded) ? 'disabled' : ''}`}
              onClick={approveAndRunSimulation}
              disabled={!approvalNeeded}
              style={{ backgroundColor: approvalNeeded ? '#3b82f6' : undefined, background: approvalNeeded ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : undefined }}
            >
              {approvalNeeded ? <CheckCircle size={16} /> : (simulationStep > 1 ? <RefreshCw className="erc-spin" size={16} /> : <PlayCircle size={16} />)}
              {approvalNeeded ? 'Approve Path & Start' : (simulationStep > 1 ? 'Simulation Running...' : 'Waiting for Path...')}
            </button>
          </div>

          <div className="erc-card erc-metrics-card">
            <h3>Smart Metrics</h3>
            <div className="erc-metrics-grid">
              <div className="erc-metric-box">
                <span className="erc-metric-lbl">Original ETA</span>
                <span className="erc-metric-val text-red">{metrics.originalEta} {metrics.originalEta !== '--' && 'min'}</span>
              </div>
              <div className="erc-metric-box">
                <span className="erc-metric-lbl">Optimized ETA</span>
                <span className="erc-metric-val text-green">{metrics.optimizedEta} {metrics.optimizedEta !== '--' && 'min'}</span>
              </div>
              <div className="erc-metric-box highlight">
                <span className="erc-metric-lbl">Time Saved</span>
                <span className="erc-metric-val">{metrics.timeSaved} {metrics.timeSaved !== '--' && 'min'}</span>
              </div>
              <div className="erc-metric-box">
                <span className="erc-metric-lbl">Signals Mod</span>
                <span className="erc-metric-val text-blue">{metrics.signalsMod}</span>
              </div>
            </div>
          </div>
          
          {simulationStep >= 2 && (
            <motion.div 
              className="erc-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3>AI Decision Insights</h3>
              <div className="erc-insight-item">
                <AlertCircle size={14} color="#f59e0b" />
                <span>Congestion scan identified <strong>critical bottlenecks</strong> along standard route.</span>
              </div>
              <div className="erc-insight-item">
                <Zap size={14} color="#10b981" />
                <span>Corridor generation successfully bypassed traffic density by <strong>42%</strong>.</span>
              </div>
              <div className="erc-insight-item">
                <Shield size={14} color="#3b82f6" />
                <span>Triggered preemptive green wave across <strong>{metrics.signalsMod} intersections</strong>.</span>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
