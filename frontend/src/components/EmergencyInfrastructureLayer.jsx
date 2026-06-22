import React, { useState, useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Shield, Plus, Flame, Activity } from 'lucide-react';

export default function EmergencyInfrastructureLayer({ mapReady, mapRef, onNodesLoaded }) {
  const [nodes, setNodes] = useState([]);
  const [visibleTypes, setVisibleTypes] = useState({
    hospital: true,
    trauma_center: true,
    fire_station: true,
    police_station: true
  });
  
  const markersRef = useRef([]);

  // Fetch nodes
  useEffect(() => {
    fetch('/data/emergency_nodes.json')
      .then(res => res.json())
      .then(data => {
        setNodes(data);
        if (onNodesLoaded) {
          onNodesLoaded(data);
        }
      })
      .catch(err => console.error("Error loading emergency nodes:", err));
  }, [onNodesLoaded]);

  // Manage Markers
  useEffect(() => {
    if (!mapReady || !mapRef || !mapRef.current) return;
    
    // Clear old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    
    // Create new markers
    nodes.forEach(node => {
      // Check visibility
      if (!visibleTypes[node.type]) return;
      
      const el = document.createElement('div');
      el.className = `infra-marker infra-${node.type}`;
      
      let iconHtml = '';
      let color = '';
      if (node.type === 'hospital' || node.type === 'trauma_center') {
        iconHtml = '<i class="fa-solid fa-square-h"></i>';
        color = '#10b981'; // Green
      } else if (node.type === 'fire_station') {
        iconHtml = '<i class="fa-solid fa-fire"></i>';
        color = '#ea580c'; // Orange
      } else if (node.type === 'police_station') {
        iconHtml = '<i class="fa-solid fa-shield-halved"></i>';
        color = '#3b82f6'; // Blue
      }
      
      el.innerHTML = `
        <div style="
          width: 24px; height: 24px; 
          background-color: ${color}; 
          border-radius: 4px; 
          border: 2px solid white;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          cursor: pointer;
        ">
          ${iconHtml}
        </div>
      `;
      
      // Add popup
      const popup = new maplibregl.Popup({ offset: 15, closeButton: false })
        .setHTML(`
          <div style="padding: 4px 8px; font-family: sans-serif;">
            <div style="font-weight: bold; font-size: 12px;">${node.name}</div>
            <div style="font-size: 10px; color: #666; text-transform: uppercase;">${node.type.replace('_', ' ')} • ${node.zone}</div>
          </div>
        `);
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([node.lng, node.lat])
        .setPopup(popup)
        .addTo(mapRef.current);
        
      markersRef.current.push(marker);
    });
    
    return () => {
      markersRef.current.forEach(m => m.remove());
    };
  }, [nodes, visibleTypes, mapReady, mapRef]);

  const toggleType = (type, isTraumaAlso = false) => {
    setVisibleTypes(prev => {
      const newState = { ...prev, [type]: !prev[type] };
      if (isTraumaAlso) {
        newState.trauma_center = !prev.hospital; // couple trauma center with hospital
      }
      return newState;
    });
  };

  return (
    <div className="infra-toggle-panel" style={{
      position: 'absolute',
      top: '12px',
      left: '12px',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      boxShadow: 'var(--shadow-premium)'
    }}>
      <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
        Emergency Infrastructure
      </div>
      
      <button 
        onClick={() => toggleType('hospital', true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'white',
          cursor: 'pointer', opacity: visibleTypes.hospital ? 1 : 0.5,
          fontSize: '11px', textAlign: 'left',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ width: '16px', height: '16px', backgroundColor: '#10b981', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <Plus size={10} color="white" />
        </div>
        Hospitals & Trauma Centers
      </button>

      <button 
        onClick={() => toggleType('fire_station')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'white',
          cursor: 'pointer', opacity: visibleTypes.fire_station ? 1 : 0.5,
          fontSize: '11px', textAlign: 'left',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ width: '16px', height: '16px', backgroundColor: '#ea580c', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <Flame size={10} color="white" />
        </div>
        Fire Stations
      </button>

      <button 
        onClick={() => toggleType('police_station')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'white',
          cursor: 'pointer', opacity: visibleTypes.police_station ? 1 : 0.5,
          fontSize: '11px', textAlign: 'left',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ width: '16px', height: '16px', backgroundColor: '#3b82f6', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <Shield size={10} color="white" />
        </div>
        Police Stations
      </button>
    </div>
  );
}
