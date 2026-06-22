import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Siren, Activity, Shield, Flame, MapPin, Navigation, Clock, Zap, Target, PlayCircle, BarChart3, AlertCircle, RefreshCw } from 'lucide-react';
import { findNearestHospital, findNearestFireStation, findNearestPoliceStation, getHaversineDistance } from '../utils/geoUtils';
import EmergencyInfrastructureLayer from './EmergencyInfrastructureLayer';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY || '';
const BENGALURU_CENTER = [77.5946, 12.9785];

export default function EmergencyCorridorCenter({ is3D, activeLang, t }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  
  const [mapReady, setMapReady] = useState(false);
  const [nodesData, setNodesData] = useState([]);
  
  // Simulation State
  const [vehicleType, setVehicleType] = useState('ambulance'); // ambulance, fire, police
  const [priority, setPriority] = useState('P1 Critical');
  const [incidentCoords, setIncidentCoords] = useState(null); // [lng, lat]
  
  const [sourceNode, setSourceNode] = useState(null);
  const [destNode, setDestNode] = useState(null);
  const [routeGeoJSON, setRouteGeoJSON] = useState(null);
  
  const [simulationStep, setSimulationStep] = useState(0); 
  // 0: Idle, 1: Detect, 2: Scan, 3: Optimize, 4: Signals, 5: Corridor, 6: Progress, 7: Done
  
  const [metrics, setMetrics] = useState({
    originalEta: '--',
    optimizedEta: '--',
    timeSaved: '--',
    distance: '--',
    signalsMod: 0,
    fuelSaved: '--'
  });

  const incidentMarkerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);

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
            'line-color': '#10b981',
            'line-width': 6,
            'line-opacity': 0.8
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
            'fill-color': '#ef4444',
            'fill-opacity': 0.2
          }
        });
      });

      map.on('click', (e) => {
        if (simulationStep > 0 && simulationStep < 7) return; // Don't interrupt running sim
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
    if (!incidentCoords || !nodesData.length) return;
    
    // Draw incident marker
    if (incidentMarkerRef.current) incidentMarkerRef.current.remove();
    
    const el = document.createElement('div');
    el.className = 'erc-incident-marker';
    el.innerHTML = `<div class="erc-pulse-ring"></div><i class="fa-solid fa-triangle-exclamation" style="color:white; font-size: 14px;"></i>`;
    
    incidentMarkerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat(incidentCoords)
      .addTo(mapRef.current);
      
    // Workflow: Nearest source -> Nearest destination
    // For Ambulance: Source = Nearest Hospital/Trauma, Dest = Nearest Trauma
    // For Fire: Source = Nearest Fire Station, Dest = Incident
    // For Police: Source = Nearest Police, Dest = Incident
    
    let source = null;
    let dest = null;
    
    const lat = incidentCoords[1];
    const lng = incidentCoords[0];
    
    if (vehicleType === 'ambulance') {
      source = findNearestHospital(lat, lng, nodesData);
      dest = findNearestHospital(lat, lng, nodesData.filter(n => n.type === 'trauma_center'));
      if (!dest) dest = source; // fallback
    } else if (vehicleType === 'fire_truck') {
      source = findNearestFireStation(lat, lng, nodesData);
      dest = { lat, lng, name: 'Incident Location', type: 'incident' };
    } else {
      source = findNearestPoliceStation(lat, lng, nodesData);
      dest = { lat, lng, name: 'Incident Location', type: 'incident' };
    }
    
    setSourceNode(source);
    setDestNode(dest);
    
    // Reset simulation
    setSimulationStep(0);
    setRouteGeoJSON(null);
    if (mapReady && mapRef.current) {
      mapRef.current.getSource('emergency-route').setData({ type: 'FeatureCollection', features: [] });
      mapRef.current.getSource('congestion-buffer').setData({ type: 'FeatureCollection', features: [] });
    }
    
  }, [incidentCoords, vehicleType, nodesData, mapReady]);

  // Run Simulation workflow
  const runSimulation = async () => {
    if (!sourceNode || !destNode || simulationStep > 0) return;
    
    try {
      // Step 1: Detect
      setSimulationStep(1);
      
      // Calculate realistic route using OSRM
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${sourceNode.lng},${sourceNode.lat};${incidentCoords[0]},${incidentCoords[1]};${destNode.lng},${destNode.lat}?overview=full&geometries=geojson`);
      const data = await res.json();
      
      if (data.code !== 'Ok') throw new Error("Routing failed");
      
      const route = data.routes[0];
      const distKm = (route.distance / 1000).toFixed(1);
      const origEta = Math.round(route.duration / 60) + 12; // Base congestion penalty
      const optEta = Math.round(route.duration / 60) * 0.45; // 55% improvement with green corridor
      
      setMetrics({
        originalEta: origEta,
        optimizedEta: Math.round(optEta),
        timeSaved: origEta - Math.round(optEta),
        distance: distKm,
        signalsMod: Math.floor(route.distance / 800), // Approx 1 signal per 800m
        fuelSaved: ((origEta - optEta) * 0.05).toFixed(1)
      });
      
      // Step 2: Scan
      await new Promise(r => setTimeout(r, 1500));
      setSimulationStep(2);
      
      // Draw congestion buffer around incident
      if (mapReady) {
        const bufferGeo = {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [generateCircle(incidentCoords, 0.5)] // 500m radius
            }
          }]
        };
        mapRef.current.getSource('congestion-buffer').setData(bufferGeo);
      }
      
      // Step 3: Optimize
      await new Promise(r => setTimeout(r, 1500));
      setSimulationStep(3);
      setRouteGeoJSON(route.geometry);
      if (mapReady) {
        mapRef.current.getSource('emergency-route').setData(route.geometry);
        
        // Fit bounds
        const bounds = new maplibregl.LngLatBounds();
        route.geometry.coordinates.forEach(c => bounds.extend(c));
        mapRef.current.fitBounds(bounds, { padding: 50 });
      }
      
      // Step 4: Signals
      await new Promise(r => setTimeout(r, 1500));
      setSimulationStep(4);
      
      // Step 5: Corridor
      await new Promise(r => setTimeout(r, 1500));
      setSimulationStep(5);
      
      // Step 6: Progress (Vehicle movement animation)
      setSimulationStep(6);
      animateVehicle(route.geometry.coordinates);
      
    } catch (err) {
      console.error("Simulation error:", err);
      setSimulationStep(0);
    }
  };
  
  const generateCircle = (center, radiusKm) => {
    const points = 64;
    const coords = [];
    for (let i = 0; i < points; i++) {
      const angle = (i * 360) / points;
      const dx = radiusKm * Math.cos((angle * Math.PI) / 180);
      const dy = radiusKm * Math.sin((angle * Math.PI) / 180);
      const lat = center[1] + (dy / 111.32);
      const lng = center[0] + (dx / (111.32 * Math.cos(center[1] * (Math.PI / 180))));
      coords.push([lng, lat]);
    }
    coords.push(coords[0]);
    return coords;
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
    const animate = () => {
      if (step >= path.length) {
        setSimulationStep(7); // Done
        return;
      }
      vehicleMarkerRef.current.setLngLat(path[step]);
      step += 2; // Speed up animation
      requestAnimationFrame(animate);
    };
    
    requestAnimationFrame(animate);
  };

  return (
    <div className="erc-container">
      {/* Map Area */}
      <div className="erc-map-wrapper">
        <div ref={mapContainerRef} className="erc-map-canvas" />
        
        <EmergencyInfrastructureLayer 
          mapReady={mapReady} 
          mapRef={mapRef} 
          onNodesLoaded={setNodesData} 
        />
        
        {/* Step Indicator Overlay */}
        {simulationStep > 0 && (
          <div className="erc-sim-overlay">
            <div className="erc-sim-header">
              <Siren className="erc-spin" color="#ef4444" size={20} />
              <h3>EMERGENCY CORRIDOR ACTIVE</h3>
            </div>
            
            <div className="erc-sim-steps">
              {['Detect', 'Scan', 'Optimize', 'Signals', 'Corridor', 'Progress', 'Done'].map((step, idx) => (
                <div key={idx} className={`erc-step ${simulationStep > idx + 1 ? 'completed' : simulationStep === idx + 1 ? 'active' : ''}`}>
                  <div className="erc-step-dot"></div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel Area */}
      <div className="erc-controls-wrapper">
        <div className="erc-panel-header">
          <Zap size={18} color="#10b981" />
          <h2>Emergency Response Center</h2>
        </div>

        <div className="erc-scroll-content">
          
          {/* Simulator Controls */}
          <div className="erc-card">
            <h3>Vehicle Simulator</h3>
            <p className="erc-text-muted">Click on map to set incident location</p>
            
            <div className="erc-form-group">
              <label>Vehicle Type</label>
              <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} className="erc-input">
                <option value="ambulance">🚑 Ambulance (Trauma Unit)</option>
                <option value="fire_truck">🚒 Fire Engine (Heavy)</option>
                <option value="police">🚓 Police Interceptor</option>
              </select>
            </div>
            
            <div className="erc-form-group">
              <label>Priority Level</label>
              <select value={priority} onChange={e => setPriority(e.target.value)} className="erc-input">
                <option value="P1 Critical">P1 - CRITICAL (Life Threatening)</option>
                <option value="P2 High">P2 - HIGH (Urgent Response)</option>
                <option value="P3 Standard">P3 - STANDARD</option>
              </select>
            </div>
            
            <div className="erc-routing-info">
              <div className="erc-route-node">
                <div className="erc-node-icon start"><Navigation size={12}/></div>
                <div>
                  <span className="erc-node-label">Origin</span>
                  <div className="erc-node-val">{sourceNode ? sourceNode.name : 'Waiting for incident...'}</div>
                </div>
              </div>
              <div className="erc-route-line"></div>
              <div className="erc-route-node">
                <div className="erc-node-icon dest"><Target size={12}/></div>
                <div>
                  <span className="erc-node-label">Destination</span>
                  <div className="erc-node-val">{destNode ? destNode.name : 'Waiting for incident...'}</div>
                </div>
              </div>
            </div>

            <button 
              className={`erc-btn-primary ${(!sourceNode || simulationStep > 0) ? 'disabled' : ''}`}
              onClick={runSimulation}
              disabled={!sourceNode || simulationStep > 0}
            >
              {simulationStep > 0 ? <RefreshCw className="erc-spin" size={16} /> : <PlayCircle size={16} />}
              {simulationStep > 0 ? 'Simulation Running...' : 'Activate Green Corridor'}
            </button>
          </div>

          {/* Metrics Panel */}
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
          
          {/* AI Decision Panel */}
          {simulationStep >= 3 && (
            <motion.div 
              className="erc-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3>AI Decision Insights</h3>
              <div className="erc-insight-item">
                <AlertCircle size={14} color="#f59e0b" />
                <span>Congestion scan identified <strong>3 critical bottlenecks</strong> along standard route.</span>
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
