// ============================================
// CrisisIQ — Resource Map Page
// ============================================
// Full-width map showing resource locations,
// heatmaps, and routing using Google Maps API.
// ============================================

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { 
  GoogleMap, 
  useJsApiLoader, 
  MarkerF, 
  InfoWindowF,
  HeatmapLayerF,
  DirectionsRenderer
} from '@react-google-maps/api';
import { 
  darkMapStyle, 
  keralaZones, 
  KERALA_CENTER, 
  GOOGLE_MAPS_LIBRARIES,
  GOOGLE_MAPS_ID,
  heatmapIntensities
} from '../config/googleMaps';
import './ResourceMap.css';

// ── Generate weighted heatmap points using exact intensities ──
const getHeatmapPoints = () => {
  if (!window.google) return [];
  const points = [];
  heatmapIntensities.forEach(zone => {
    // Generate multiple points proportional to intensity
    // Higher intensity = more clustered points = brighter heat
    const count = Math.ceil(zone.intensity * 20);
    for (let i = 0; i < count; i++) {
      const jitterLat = zone.lat + (Math.random() - 0.5) * 0.12;
      const jitterLng = zone.lng + (Math.random() - 0.5) * 0.12;
      points.push({
        location: new window.google.maps.LatLng(jitterLat, jitterLng),
        weight: zone.intensity
      });
    }
  });
  return points;
};

function ResourceMap() {
  const [selectedZone, setSelectedZone] = useState(null);
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [activeType, setActiveType] = useState('All');
  const [activeSeverity, setActiveSeverity] = useState('All');
  const [activeDistrict, setActiveDistrict] = useState('All');
  const [routeEta, setRouteEta] = useState(null);
  const mapRef = useRef(null);

  // Load Maps with visualization + places libraries
  const { isLoaded, loadError } = useJsApiLoader({
    id: GOOGLE_MAPS_ID,
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    calculateRoute();
  }, []);

  // Calculate route from Ernakulam Depot (STABLE) to Wayanad (CRITICAL)
  const calculateRoute = async () => {
    if (!window.google) return;
    const directionsService = new window.google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: { lat: 9.9816, lng: 76.2999 }, // Ernakulam
        destination: { lat: 11.6854, lng: 76.1320 }, // Wayanad
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      setDirectionsResponse(results);
      // Extract ETA
      if (results.routes?.[0]?.legs?.[0]) {
        setRouteEta(results.routes[0].legs[0].duration.text);
      }
    } catch (error) {
      console.error("Error fetching directions", error);
    }
  };

  const resetView = () => {
    if (mapRef.current) {
      mapRef.current.panTo(KERALA_CENTER);
      mapRef.current.setZoom(8);
    }
    setActiveType('All');
    setActiveSeverity('All');
    setActiveDistrict('All');
    setSelectedZone(null);
  };

  const handleZoneClick = (zone) => {
    setSelectedZone(zone);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: zone.lat, lng: zone.lng });
      mapRef.current.setZoom(10);
    }
  };

  // Filtering
  const filteredZones = keralaZones.filter(zone => {
    if (activeSeverity !== 'All' && zone.severity !== activeSeverity.toUpperCase()) return false;
    if (activeDistrict !== 'All' && zone.name !== activeDistrict) return false;
    return true;
  });

  // Calculate progress bar width
  const getProgressWidth = (resources, need) => {
    return Math.min((resources / need) * 100, 100);
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'zone-critical';
      case 'HIGH': return 'zone-high';
      case 'MEDIUM': return 'zone-medium';
      case 'STABLE': return 'zone-stable';
      default: return '';
    }
  };

  const renderMap = () => {
    if (loadError) {
      return <div className="map-error">Error loading Maps API: {loadError.message}</div>;
    }

    if (!isLoaded) {
      return (
        <div className="map-loading">
          <div className="map-loading-spinner"></div>
          <span>Initializing Geospatial Systems...</span>
        </div>
      );
    }

    return (
      <GoogleMap
        mapContainerClassName="full-map-container"
        center={KERALA_CENTER}
        zoom={8}
        onLoad={onMapLoad}
        options={{
          styles: darkMapStyle,
          mapTypeId: 'roadmap',
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          backgroundColor: '#050A14',
        }}
        onClick={() => setSelectedZone(null)}
      >
        {/* Heatmap Layer with exact intensity data */}
        <HeatmapLayerF
          data={getHeatmapPoints()}
          options={{
            radius: 45,
            opacity: 0.7,
            gradient: [
              'rgba(0, 0, 0, 0)',
              'rgba(255, 255, 0, 0.4)',
              'rgba(255, 200, 0, 0.6)',
              'rgba(255, 150, 0, 0.7)',
              'rgba(255, 100, 0, 0.8)',
              'rgba(255, 69, 0, 0.85)',
              'rgba(255, 40, 0, 0.9)',
              'rgba(255, 0, 0, 1)',
            ]
          }}
        />

        {/* Directions / Routing */}
        {directionsResponse && (
          <DirectionsRenderer
            directions={directionsResponse}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#00D4FF',
                strokeOpacity: 0,
                icons: [{
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    strokeColor: '#00D4FF',
                    scale: 4,
                  },
                  offset: '0',
                  repeat: '20px',
                }],
              }
            }}
          />
        )}

        {/* Custom Markers */}
        {filteredZones.map((zone) => {
          const svgMarker = {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: zone.color,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#FFFFFF',
            scale: 10,
          };

          return (
            <MarkerF
              key={zone.id}
              position={{ lat: zone.lat, lng: zone.lng }}
              icon={svgMarker}
              onClick={() => handleZoneClick(zone)}
            />
          );
        })}

        {/* Custom Dark-Themed Info Window */}
        {selectedZone && (
          <InfoWindowF
            position={{ lat: selectedZone.lat, lng: selectedZone.lng }}
            onCloseClick={() => setSelectedZone(null)}
            options={{ maxWidth: 320 }}
          >
            <div className="dark-info-window">
              <h3 className="diw-title">{selectedZone.name}</h3>
              <span 
                className="diw-severity-pill"
                style={{ 
                  backgroundColor: `${selectedZone.color}22`,
                  color: selectedZone.color,
                  border: `1px solid ${selectedZone.color}55`
                }}
              >
                {selectedZone.severity}
              </span>
              <div className="diw-stats">
                <div className="diw-row">
                  <span className="diw-label">Resources:</span>
                  <span className="diw-value">{selectedZone.resources} available</span>
                </div>
                <div className="diw-row">
                  <span className="diw-label">Affected:</span>
                  <span className="diw-value">{selectedZone.affected?.toLocaleString() || selectedZone.population?.toLocaleString()} people</span>
                </div>
                <div className="diw-row">
                  <span className="diw-label">Severity Score:</span>
                  <span className="diw-value">{selectedZone.severityScore?.toFixed(1) || (selectedZone.score * 10).toFixed(1)} / 100</span>
                </div>
                <div className="diw-row">
                  <span className="diw-label">Last updated:</span>
                  <span className="diw-value">{selectedZone.lastUpdated}</span>
                </div>
              </div>
              <a className="diw-link" href="#" onClick={(e) => e.preventDefault()}>
                View Details →
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    );
  };

  return (
    <div className="resource-map-page">
      {/* ── TOP FILTER BAR ── */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Resource Type</label>
          <select value={activeType} onChange={(e) => setActiveType(e.target.value)}>
            <option>All</option>
            <option>Ambulance</option>
            <option>Medical</option>
            <option>Food</option>
            <option>Shelter</option>
            <option>Water</option>
            <option>Engineering</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Severity</label>
          <select value={activeSeverity} onChange={(e) => setActiveSeverity(e.target.value)}>
            <option>All</option>
            <option>Critical</option>
            <option>High</option>
            <option>Medium</option>
            <option>Stable</option>
          </select>
        </div>

        <div className="filter-group">
          <label>District</label>
          <select value={activeDistrict} onChange={(e) => setActiveDistrict(e.target.value)}>
            <option>All</option>
            {keralaZones.map(z => <option key={z.id}>{z.name}</option>)}
          </select>
        </div>

        <button className="btn-reset-view" onClick={resetView}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
            </svg>
            Reset View
        </button>
      </div>

      <div className="map-layout-grid">
        {/* ── MAIN MAP AREA ── */}
        <div className="map-main-panel">
            {renderMap()}
            
            <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.7)', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', pointerEvents: 'none', zIndex: 10 }}>
              Powered by Google Maps Platform
            </div>

            {/* Route ETA overlay */}
            {routeEta && (
              <div className="route-eta-overlay">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" strokeWidth="2.5">
                  <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>Ernakulam → Wayanad</span>
                <span className="eta-time">ETA: {routeEta}</span>
              </div>
            )}
                
            <div className="map-legend">
                <h4>Map Legend</h4>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#FF1744'}}></span>
                    Critical Severity
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#FF6D00'}}></span>
                    High Severity
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#FFB800'}}></span>
                    Medium Severity
                </div>
                <div className="legend-item">
                    <span className="legend-dot" style={{background: '#00FF88'}}></span>
                    Stable Area
                </div>
                <div className="legend-item legend-line">
                    <span className="legend-route"></span>
                    Resource Route
                </div>
            </div>
        </div>

        {/* ── RIGHT PANEL: ZONE LIST ── */}
        <div className="zone-list-panel">
            <div className="panel-header">
                <h2>Zone Status</h2>
                <div className="live-indicator">
                    <span className="live-dot"></span>
                    LIVE
                </div>
            </div>
            
            <div className="zone-scroll-list">
                {filteredZones.map(zone => (
                    <div 
                        key={zone.id} 
                        className={`zone-list-item ${selectedZone && selectedZone.id === zone.id ? 'active' : ''}`}
                        onClick={() => handleZoneClick(zone)}
                    >
                        <div className="zone-item-top">
                            <span className="zone-item-name">{zone.name}</span>
                            <span className={`zone-item-badge ${getSeverityClass(zone.severity)}`}>
                                {zone.severity}
                            </span>
                        </div>
                        
                        <div className="zone-item-stats">
                            <span className="res-count">{zone.resources} res</span>
                            <span className="res-need">/ {zone.need} needed</span>
                        </div>
                        
                        <div className="zone-progress-track">
                            <div 
                                className="zone-progress-fill" 
                                style={{
                                    width: `${getProgressWidth(zone.resources, zone.need)}%`,
                                    background: zone.color
                                }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ResourceMap);
