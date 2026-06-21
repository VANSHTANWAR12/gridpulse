import React from 'react';
import { motion } from 'framer-motion';
import { translateCause } from '../translations';

export default function DependencyGraph({ selectedIncident, t, activeLang }) {
  if (!selectedIncident) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
        {t('graph-no-incident')}
      </div>
    );
  }

  // Define nodes dynamically based on selected incident
  const nodes = [
    {
      id: 'incident',
      label: selectedIncident.id,
      subtitle: translateCause(selectedIncident.event_cause, activeLang),
      x: 60,
      y: 120,
      color: 'var(--accent-red)',
      icon: '🚨'
    },
    {
      id: 'sop',
      label: t('graph-node-sop'),
      subtitle: t('graph-node-allocation'),
      x: 200,
      y: 120,
      color: 'var(--accent-purple)',
      icon: '📋'
    },
    {
      id: 'police',
      label: t('graph-node-police'),
      subtitle: t('graph-node-officers').replace('{count}', selectedIncident.manpower_needed || 1),
      x: 350,
      y: 50,
      color: 'var(--accent-blue)',
      icon: '👮'
    },
    {
      id: 'barricades',
      label: t('graph-node-barricades'),
      subtitle: t('graph-node-placed').replace('{count}', selectedIncident.barricades_needed || 0),
      x: 350,
      y: 120,
      color: 'var(--accent-yellow)',
      icon: '🚧'
    },
    {
      id: 'sign',
      label: t('graph-node-warning'),
      subtitle: t('graph-node-vms'),
      x: 350,
      y: 190,
      color: 'var(--accent-orange)',
      icon: '🪧'
    },
    {
      id: 'corridor',
      label: selectedIncident.corridor || t('graph-node-road'),
      subtitle: selectedIncident.police_station || 'Yelahanka',
      x: 500,
      y: 120,
      color: 'var(--accent-green)',
      icon: '🛣️'
    }
  ];

  // Connection links defining start/end coordinates for curves
  const links = [
    { from: 'incident', to: 'sop', color: 'rgba(239, 68, 68, 0.4)' },
    { from: 'sop', to: 'police', color: 'rgba(139, 92, 246, 0.4)' },
    { from: 'sop', to: 'barricades', color: 'rgba(139, 92, 246, 0.4)' },
    { from: 'sop', to: 'sign', color: 'rgba(139, 92, 246, 0.4)' },
    { from: 'police', to: 'corridor', color: 'rgba(59, 130, 246, 0.4)' },
    { from: 'barricades', to: 'corridor', color: 'rgba(245, 158, 11, 0.4)' },
    { from: 'sign', to: 'corridor', color: 'rgba(249, 115, 22, 0.4)' }
  ];

  // Helper to calculate smooth cubic Bezier curve paths between nodes
  const getCurvePath = (x1, y1, x2, y2) => {
    const cpX1 = x1 + (x2 - x1) / 2;
    const cpY1 = y1;
    const cpX2 = x1 + (x2 - x1) / 2;
    const cpY2 = y2;
    return `M ${x1} ${y1} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x2} ${y2}`;
  };

  return (
    <svg width="100%" height="100%" viewBox="0 0 580 240" style={{ background: 'transparent' }}>
      <defs>
        {/* Glowing Filters for Cyberpunk Nodes */}
        <filter id="glow-node" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        
        {/* Glowing Line marker arrows */}
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="6"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill="rgba(255, 255, 255, 0.3)" />
        </marker>
      </defs>

      {/* 1. Link cables rendered as smooth, animated cubic curves */}
      <g>
        {links.map((link, idx) => {
          const fromNode = nodes.find(n => n.id === link.from);
          const toNode = nodes.find(n => n.id === link.to);
          if (!fromNode || !toNode) return null;
          
          const pathString = getCurvePath(fromNode.x, fromNode.y, toNode.x, toNode.y);

          return (
            <g key={idx}>
              {/* Backglow line */}
              <path
                d={pathString}
                fill="none"
                stroke={link.color}
                strokeWidth={3}
                opacity={0.3}
              />
              {/* Animated crawling dashed overlay */}
              <path
                d={pathString}
                fill="none"
                stroke="rgba(255, 255, 255, 0.5)"
                strokeWidth={1.5}
                className="graph-svg-line"
                markerEnd="url(#arrow)"
              />
            </g>
          );
        })}
      </g>

      {/* 2. Interactive Nodes rendered using Framer Motion */}
      <g>
        {nodes.map((node) => {
          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
              <motion.g
                className="graph-node"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: node.id === 'incident' ? 0 : 0.05 }}
                whileHover={{ scale: 1.05 }}
              >
                {/* Outer Glow ring */}
                <circle
                  r={22}
                  fill="none"
                  stroke={node.color}
                  strokeWidth={1.5}
                  opacity={0.4}
                  style={{ filter: 'url(#glow-node)' }}
                />
                
                {/* Base Circle */}
                <circle
                  r={18}
                  fill="#1e293b"
                  stroke={node.color}
                  strokeWidth={2}
                  className="graph-node-circle"
                />

                {/* Node Icon */}
                <text
                  y={4}
                  textAnchor="middle"
                  fontSize={12}
                  style={{ select: 'none', pointerEvents: 'none' }}
                >
                  {node.icon}
                </text>

                {/* Node Metadata Texts */}
                <text
                  x={0}
                  y={28}
                  textAnchor="middle"
                  className="graph-node-title"
                >
                  {node.label.length > 15 ? node.label.substring(0, 12) + '...' : node.label}
                </text>
                
                <text
                  x={0}
                  y={38}
                  textAnchor="middle"
                  className="graph-node-subtitle"
                >
                  {node.subtitle}
                </text>
              </motion.g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
