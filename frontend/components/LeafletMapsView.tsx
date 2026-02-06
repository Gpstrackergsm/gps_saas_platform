"use client"

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { socket } from '@/lib/socket';
import { Plus, Minus } from 'lucide-react';

// Fix Leaflet marker icons in Next.js
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface Vehicle {
    id: string;
    lat: number;
    lng: number;
    speed: number;
    lastUpdate: Date;
}

function MapUpdater({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

function CustomZoomControl() {
    const map = useMap();

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        map.zoomIn();
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        map.zoomOut();
    };

    return (
        <div className="absolute bottom-6 right-4 z-[400] flex flex-col gap-2">
            <button
                onClick={handleZoomIn}
                className="bg-white text-gray-700 p-2 rounded-md shadow-md hover:bg-gray-50 border border-gray-200"
                aria-label="Zoom In"
            >
                <Plus size={20} />
            </button>
            <button
                onClick={handleZoomOut}
                className="bg-white text-gray-700 p-2 rounded-md shadow-md hover:bg-gray-50 border border-gray-200"
                aria-label="Zoom Out"
            >
                <Minus size={20} />
            </button>
        </div>
    );
}

export default function LeafletMapsView() {
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [center, setCenter] = useState<[number, number]>([31.6295, -7.9811]); // Default Marrakesh-Safi, Morocco
    const updateCounter = useRef(0);

    useEffect(() => {
        socket.connect();
        socket.on('position', (data: any) => {
            console.log('New position:', data);

            updateCounter.current += 1;

            setVehicles(prev => ({
                ...prev,
                [data.deviceId]: {
                    id: data.deviceId,
                    lat: data.lat,
                    lng: data.lng,
                    speed: data.speed,
                    lastUpdate: new Date()
                }
            }));

            // Auto-center every 3 updates
            if (updateCounter.current % 3 === 0) {
                setCenter([data.lat, data.lng]);
            }
        });

        return () => {
            socket.off('position');
            socket.disconnect();
        };
    }, []);

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
                zoomControl={false}
            >
                {/* Free OSM Tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={center} />
                <CustomZoomControl />

                {Object.values(vehicles).map((v) => (
                    <Marker key={v.id} position={[v.lat, v.lng]} icon={icon}>
                        <Popup>
                            <div className="text-black">
                                <strong>Device: {v.id}</strong><br />
                                Speed: {v.speed} km/h<br />
                                Last Seen: {new Date(v.lastUpdate).toLocaleTimeString()}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
