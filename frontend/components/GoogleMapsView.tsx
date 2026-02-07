"use client"

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, OverlayView, Polyline, Circle } from '@react-google-maps/api';
import { socket } from '@/lib/socket';
import api from '@/lib/api';
import { Plus, Minus, Navigation, Layers, History, Play, Pause, Trash2, Activity } from 'lucide-react';

const containerStyle = {
    width: '100%',
    height: '100%'
};

// Default center (Marrakesh, Morocco - User Requested)
const defaultCenter = {
    lat: 31.626829275702946,
    lng: -8.003743956539244
};

interface Vehicle {
    id: string;
    device_id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    lastUpdate: Date;
}

export default function GoogleMapsView() {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        region: "MA"
    });

    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [center, setCenter] = useState(defaultCenter);
    const [mapType, setMapType] = useState<string>('hybrid');
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const updateCounter = useRef(0);
    const vehiclesRef = useRef<Record<string, Vehicle>>({}); // Ref to access current vehicles in socket

    // Track if we have performed the initial zoom-to-fit
    const hasFittedBounds = useRef(false);

    // Sync ref with state
    useEffect(() => {
        vehiclesRef.current = vehicles;
    }, [vehicles]);

    // Auto-fit bounds when vehicles are loaded for the first time
    useEffect(() => {
        if (map && !hasFittedBounds.current && Object.keys(vehicles).length > 0) {
            const bounds = new google.maps.LatLngBounds();
            let hasValidLoc = false;

            Object.values(vehicles).forEach(v => {
                if (v.lat && v.lng) {
                    bounds.extend({ lat: v.lat, lng: v.lng });
                    hasValidLoc = true;
                }
            });

            if (hasValidLoc) {
                console.log("Fitting bounds to vehicles...");
                map.fitBounds(bounds);

                // If only 1 vehicle, the zoom might be too close (max zoom), so we back out slightly check
                // Google Maps handles single point bounds often by zooming to max.
                // We can add a listener for 'bounds_changed' or just check zoom after a tick if needed, 
                // but usually fitBounds is okay. 
                // A common trick for single vehicle is:
                if (Object.keys(vehicles).length === 1) {
                    map.setZoom(16); // Reasonable street level
                }

                hasFittedBounds.current = true;
            }
        }
    }, [map, vehicles]);

    // History Mode State
    const [isHistoryMode, setIsHistoryMode] = useState(false);
    const [historyPoints, setHistoryPoints] = useState<any[]>([]);
    const [selectedHistoryPoint, setSelectedHistoryPoint] = useState<any>(null); // Track clicked dot
    const [playbackIndex, setPlaybackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]); // Default Today
    const [showRoute, setShowRoute] = useState(false);
    const [mapResetKey, setMapResetKey] = useState(0);
    const polylinesRef = useRef<google.maps.Polyline[]>([]); // Track polyline instances for manual cleanup
    const circleRefs = useRef<google.maps.Circle[]>([]); // Track circle instances for manual cleanup

    // Analysis Mode State
    const [analysisPoints, setAnalysisPoints] = useState<any[]>([]);
    const [analysisStats, setAnalysisStats] = useState<{ distance: string, duration: string } | null>(null);

    const calculatePathStats = (p1: any, p2: any) => {
        if (!historyPoints.length) return;

        // Find indices
        const idx1 = historyPoints.findIndex(p => p.timestamp === p1.timestamp);
        const idx2 = historyPoints.findIndex(p => p.timestamp === p2.timestamp);

        if (idx1 === -1 || idx2 === -1) return;

        const startIdx = Math.min(idx1, idx2);
        const endIdx = Math.max(idx1, idx2);

        // Calculate total distance along the path
        let totalDistKm = 0;
        for (let i = startIdx; i < endIdx; i++) {
            const loc1 = historyPoints[i];
            const loc2 = historyPoints[i + 1];

            // Haversine formula
            const R = 6371; // km
            const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
            const dLon = (loc2.lng - loc1.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            totalDistKm += R * c;
        }

        // Calculate time duration
        const startTime = new Date(historyPoints[startIdx].timestamp).getTime();
        const endTime = new Date(historyPoints[endIdx].timestamp).getTime();
        const diffMs = endTime - startTime;

        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        setAnalysisStats({
            distance: totalDistKm.toFixed(2),
            duration: `${hours}h ${minutes}m`
        });
    };

    const handleHistoryPointClick = (point: any) => {
        // If we already have 2 points, reset and start over with this new one
        if (analysisPoints.length === 2) {
            setAnalysisPoints([point]);
            setAnalysisStats(null);
            return;
        }

        const newPoints = [...analysisPoints, point];
        setAnalysisPoints(newPoints);

        if (newPoints.length === 2) {
            calculatePathStats(newPoints[0], newPoints[1]);
        }
    };

    const handleClearTrajectory = () => {
        if (!selectedVehicle) return;

        // Only clear UI state - do NOT delete from database
        setIsPlaying(false);
        setPlaybackIndex(0);
        setSelectedHistoryPoint(null);
        setShowRoute(false);
        setHistoryPoints([]);

        // Clear analysis
        setAnalysisPoints([]);
        setAnalysisStats(null);
    };

    const fetchHistory = async () => {
        if (!selectedVehicle) return;

        try {
            const start = `${historyDate} 00:00:00`;
            const end = `${historyDate} 23:59:59`;

            const res = await api.get(`/devices/${selectedVehicle.device_id}/history`, {
                params: { start, end }
            });

            if (res.data && res.data.length > 0) {
                setHistoryPoints(res.data);
                setPlaybackIndex(0);
                setIsPlaying(false);
                setShowRoute(true); // Show route
                // Center map on start of history
                if (map) {
                    map.panTo({ lat: res.data[0].lat, lng: res.data[0].lng });
                }
            } else {
                alert("No history found for this date.");
                setHistoryPoints([]);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
            alert("Error fetching history.");
        }
    };

    // Playback Logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying && historyPoints.length > 0) {
            interval = setInterval(() => {
                setPlaybackIndex(prev => {
                    if (prev >= historyPoints.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 500); // 500ms per step
        }
        return () => clearInterval(interval);
    }, [isPlaying, historyPoints]);

    // Initial Load
    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
        map.setMapTypeId('hybrid');
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await api.get('/devices');
            const vehicleMap: Record<string, Vehicle> = {};

            res.data.forEach((d: any) => {
                // If lat/lng exists, use it. Otherwise default to Marrakesh with a small random offset to prevent overlap.
                const hasLocation = d.lat && d.lng;

                // Add small jitter for default locations: +/- 0.002 degrees (approx 200m)
                const jitter = () => (Math.random() - 0.5) * 0.004;

                vehicleMap[d.device_id] = {
                    id: d.device_id,
                    name: d.name || d.device_id, // Fallback to ID if name missing
                    lat: hasLocation ? d.lat : (defaultCenter.lat + jitter()),
                    lng: hasLocation ? d.lng : (defaultCenter.lng + jitter()),
                    speed: d.speed || 0,
                    lastUpdate: d.last_update ? new Date(d.last_update) : new Date()
                };
            });
            setVehicles(vehicleMap);
        } catch (err) {
            console.error("Failed to fetch vehicles", err);
        }
    };

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    // Socket Connection
    useEffect(() => {
        socket.connect();

        socket.on('position', (data: any) => {
            // SECURITY CHECK: Ignore updates for devices we don't own
            if (!vehiclesRef.current[data.deviceId as string]) {
                return;
            }

            console.log('New position:', data);

            updateCounter.current += 1;

            // REMOVED: Aggressive auto-centering on every update.
            // We only want to center if the user explicitly "selects" a vehicle to follow, 
            // or we rely on the initial fitBounds.
            // if (map && (updateCounter.current === 1 || updateCounter.current % 3 === 0)) {
            //    map.panTo({ lat: data.lat, lng: data.lng });
            // }

            setVehicles(prev => {
                const deviceId = data.deviceId as string;

                // SECURITY FIX: Only update if we already know about this device (fetched via API)
                // This prevents "ghost" vehicles from other users appearing on the map
                if (!prev[deviceId]) {
                    // console.warn(`Ignored update for unknown device: ${deviceId}`);
                    return prev;
                }

                const startName = prev[deviceId]?.name || deviceId;

                const updated = {
                    ...prev,
                    [deviceId]: {
                        ...prev[deviceId], // Keep existing properties
                        lat: data.lat,
                        lng: data.lng,
                        speed: data.speed,
                        lastUpdate: new Date()
                    }
                };

                // If we have a selected vehicle, update it in real-time for the InfoWindow
                if (selectedVehicle && selectedVehicle.id === data.deviceId) {
                    setSelectedVehicle(updated[data.deviceId]);
                }

                return updated;
            });
        });

        return () => {
            socket.off('position');
            socket.disconnect();
        };
    }, [selectedVehicle, map]);

    // Custom Controls
    const handleZoomIn = () => {
        if (map) {
            map.setZoom((map.getZoom() || 18) + 1);
        }
    };

    const handleZoomOut = () => {
        if (map) {
            map.setZoom((map.getZoom() || 18) - 1);
        }
    };

    const toggleMapType = () => {
        setMapType(prev => prev === 'roadmap' ? 'hybrid' : 'roadmap');
    };

    // Imperative Polyline Management
    useEffect(() => {
        // 1. Cleanup all existing polylines
        if (polylinesRef.current.length > 0) {
            polylinesRef.current.forEach(line => line.setMap(null));
            polylinesRef.current = [];
        }

        // 2. If we have points and route is shown, create new polylines
        if (map && showRoute && historyPoints.length > 0) {
            const segments: any[][] = [];
            let currentSegment: any[] = [historyPoints[0]];

            for (let i = 1; i < historyPoints.length; i++) {
                const p1 = historyPoints[i - 1];
                const p2 = historyPoints[i];

                // Calculate distance
                const R = 6371; // km
                const dLat = (p2.lat - p1.lat) * Math.PI / 180;
                const dLon = (p2.lng - p1.lng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distanceKm = R * c;

                // JUMP THRESHOLD: 2 km
                if (distanceKm > 2) {
                    segments.push(currentSegment);
                    currentSegment = [p2];
                } else {
                    currentSegment.push(p2);
                }
            }
            segments.push(currentSegment);

            // Render Segments
            segments.forEach(segment => {
                const polyline = new google.maps.Polyline({
                    path: segment.map(p => ({ lat: p.lat, lng: p.lng })),
                    strokeColor: "#ef4444", // Red
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                    map: map
                });
                polylinesRef.current.push(polyline);
            });
        }
    }, [historyPoints, showRoute, map]);

    // Imperative Dot Management
    useEffect(() => {
        // 1. Cleanup all existing dots
        if (circleRefs.current.length > 0) {
            circleRefs.current.forEach(circle => circle.setMap(null));
            circleRefs.current = [];
        }

        // 2. If we have points and route is shown, create new dots
        if (map && showRoute && historyPoints.length > 0) {
            historyPoints.forEach((point) => {
                // Check if this point is selected for analysis
                const isSelected = analysisPoints.some(p => p.timestamp === point.timestamp);

                const circle = new google.maps.Circle({
                    map: map,
                    center: { lat: point.lat, lng: point.lng },
                    radius: isSelected ? 6 : 2, // Larger if selected
                    strokeColor: isSelected ? "#ef4444" : "#2563eb", // Red/Blue
                    strokeOpacity: 0.9,
                    strokeWeight: isSelected ? 2 : 1,
                    fillColor: isSelected ? "#fca5a5" : "#60a5fa",
                    fillOpacity: 0.9,
                    zIndex: isSelected ? 200 : 100
                });

                // Add click listener
                circle.addListener('click', () => {
                    setSelectedHistoryPoint(point); // Show InfoWindow
                    handleHistoryPointClick(point); // Add to analysis
                });

                circleRefs.current.push(circle);
            });
        }
    }, [historyPoints, showRoute, map, analysisPoints]);

    if (!isLoaded) {
        return <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500">Loading Google Maps...</div>;
    }

    return (
        <div className="relative h-full w-full">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={18}
                onLoad={onLoad}
                onUnmount={onUnmount}
                mapTypeId={mapType}
                options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                }}
            >
                {Object.values(vehicles).map((v) => (
                    <div key={v.id}>
                        {/* The Pin */}
                        <Marker
                            position={{ lat: v.lat, lng: v.lng }}
                            onClick={() => setSelectedVehicle(v)}
                            icon={{
                                path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
                                fillColor: "#EA4335", // Google Red
                                fillOpacity: 1,
                                strokeWeight: 1,
                                strokeColor: "#ffffff",
                                scale: 2, // Adjust scale as needed for SVG path
                                anchor: new google.maps.Point(12, 22), // Anchor at the bottom tip
                            }}
                        />
                        {/* The Label Box */}
                        <OverlayView
                            position={{ lat: v.lat, lng: v.lng }}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                            getPixelPositionOffset={(x, y) => ({ x: 0, y: -85 })} // Moved up significantly to clear the pin
                        >
                            <div
                                className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border-2 border-white flex items-center justify-center gap-1 min-w-[100px] cursor-pointer hover:z-50 relative"
                                onClick={() => setSelectedVehicle(v)}
                                style={{ transform: 'translateX(-50%)' }} // Center horizontally regardless of width
                            >
                                <Navigation size={12} fill="white" className="transform rotate-0" />
                                <span>{v.name}</span>
                            </div>
                        </OverlayView>
                    </div>
                ))}

                {/* History Mode: Route Line & Playback Marker */}
                {isHistoryMode && (
                    <>
                        {/* The Path - Handled imperatively via useEffect now */}
                        {/* {showRoute && historyPoints.length > 0 && ...} */}

                        {/* Note: Circles are now rendered imperatively via useEffect for better stability */}

                        {/* Info Window for Selected History Dot */}
                        {selectedHistoryPoint && (
                            <InfoWindow
                                position={{ lat: selectedHistoryPoint.lat, lng: selectedHistoryPoint.lng }}
                                onCloseClick={() => setSelectedHistoryPoint(null)}
                            >
                                <div className="text-black p-1 text-sm">
                                    <div className="font-bold text-gray-700 mb-1">
                                        {new Date(selectedHistoryPoint.timestamp).toLocaleTimeString()} <br />
                                        {new Date(selectedHistoryPoint.timestamp).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-1 text-blue-600 font-semibold">
                                        <Activity size={14} />
                                        {Math.round(selectedHistoryPoint.speed)} km/h
                                    </div>
                                </div>
                            </InfoWindow>
                        )}


                        {/* The Moving Marker - Only show if we actually have points and route is shown */}
                        {showRoute && historyPoints.length > 0 && (
                            <Marker
                                position={{
                                    lat: historyPoints[playbackIndex].lat,
                                    lng: historyPoints[playbackIndex].lng
                                }}
                                icon={{
                                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                    scale: 5,
                                    fillColor: "#2563eb",
                                    fillOpacity: 1,
                                    strokeWeight: 2,
                                    strokeColor: "white",
                                    rotation: historyPoints[playbackIndex].course || 0
                                }}
                            />
                        )}
                    </>
                )}


            </GoogleMap>

            {/* Custom Zoom Controls */}
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

            {/* History Toggle Button */}
            <button
                onClick={() => setIsHistoryMode(!isHistoryMode)}
                className={`absolute top-4 right-16 z-[400] p-2 rounded-md shadow-md transition-colors border border-gray-200 ${isHistoryMode ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-800 hover:bg-gray-50'}`}
                aria-label="Toggle History Mode"
                title="History Replay"
            >
                <History size={20} />
            </button>

            {/* Map Type Toggle Button */}
            <button
                onClick={toggleMapType}
                className="absolute top-4 right-4 z-[400] bg-white text-gray-800 p-2 rounded-md shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
                aria-label="Toggle Map Type"
                title={mapType === 'roadmap' ? 'Switch to Satellite' : 'Switch to Map'}
            >
                <Layers size={20} />
            </button>

            {/* Analysis Pop-up Window */}
            {analysisStats && analysisPoints.length === 2 && (
                <div className="absolute top-24 right-4 z-[450] bg-white p-4 rounded-xl shadow-2xl border border-gray-200 w-64 animate-fade-in">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                            <Activity size={18} className="text-blue-600" />
                            Trip Analysis
                        </h3>
                        <button
                            onClick={() => { setAnalysisPoints([]); setAnalysisStats(null); }}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Close"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Distance</div>
                            <div className="text-2xl font-bold text-gray-800 tracking-tight">
                                {analysisStats.distance} <span className="text-sm text-gray-500 font-normal">km</span>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Duration</div>
                            <div className="text-2xl font-bold text-gray-800 tracking-tight">
                                {analysisStats.duration}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => { setAnalysisPoints([]); setAnalysisStats(null); }}
                        className="w-full mt-4 bg-white border border-red-200 text-red-600 font-medium py-2 rounded-lg hover:bg-red-50 transition-colors text-sm"
                    >
                        Clear Analysis
                    </button>
                </div>
            )}

            {/* History Controls Panel */}
            {isHistoryMode && (
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[400] bg-white p-4 rounded-xl shadow-lg border border-gray-200 w-[90%] max-w-2xl flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4 border-b pb-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={historyDate}
                                onChange={(e) => setHistoryDate(e.target.value)}
                                className="border p-2 rounded text-black"
                            />
                            <button
                                onClick={fetchHistory}
                                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                                disabled={!selectedVehicle}
                            >
                                Fetch
                            </button>
                            <button
                                onClick={handleClearTrajectory}
                                className="bg-red-600 text-white p-2 rounded hover:bg-red-700 disabled:opacity-50"
                                disabled={!selectedVehicle}
                                title="Clear from Map"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                        <div className="text-sm text-gray-600">
                            {!selectedVehicle ? "Select a vehicle first!" : `History for ${selectedVehicle.name}`}
                        </div>
                    </div>

                    {/* Hint for Analysis */}
                    {analysisPoints.length < 2 && historyPoints.length > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded text-center border border-blue-100">
                            💡 Tip: Click on two dots on the route to measure distance and time.
                        </div>
                    )}

                    {historyPoints.length > 0 && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700"
                            >
                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>

                            <input
                                type="range"
                                min="0"
                                max={historyPoints.length - 1}
                                value={playbackIndex}
                                onChange={(e) => {
                                    setPlaybackIndex(parseInt(e.target.value));
                                    setIsPlaying(false);
                                }}
                                className="flex-1"
                            />

                            <div className="text-xs text-gray-500 w-32 text-right">
                                {new Date(historyPoints[playbackIndex].timestamp).toLocaleTimeString()} <br />
                                {Math.round(historyPoints[playbackIndex].speed)} km/h
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
