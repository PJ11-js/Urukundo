import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Coords { lat: number; lng: number }

interface Props {
  me: Coords;
  partner: Coords;
  partnerName: string;
  distanceKm: number;
}

const meIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:2px solid white;box-shadow:0 0 0 3px rgba(239,68,68,0.35)"></div>',
});
const partnerIcon = L.divIcon({
  className: '',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:2px solid white;box-shadow:0 0 0 3px rgba(34,197,94,0.35)"></div>',
});

const LiveLocationMap: React.FC<Props> = ({ me, partner, partnerName, distanceKm }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const meMarkerRef = useRef<L.Marker | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false })
      .setView([me.lat, me.lng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
    meMarkerRef.current = L.marker([me.lat, me.lng], { icon: meIcon }).addTo(map);
    partnerMarkerRef.current = L.marker([partner.lat, partner.lng], { icon: partnerIcon }).bindPopup(partnerName).addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    meMarkerRef.current?.setLatLng([me.lat, me.lng]);
    partnerMarkerRef.current?.setLatLng([partner.lat, partner.lng]);
    mapRef.current.fitBounds(L.latLngBounds([[me.lat, me.lng], [partner.lat, partner.lng]]), { padding: [30, 30], maxZoom: 15 });
  }, [me.lat, me.lng, partner.lat, partner.lng]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-gray-100" style={{ height: 160 }}>
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 bg-white/95 px-2.5 py-1 rounded-full text-xs font-bold text-gray-700 shadow">
        📍 {distanceKm} km
      </div>
    </div>
  );
};

export default LiveLocationMap;
