import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, SafeAreaView, Platform, Dimensions, Alert, Modal } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Map as MapIcon, List, LogOut, Navigation, CircleParking, Calendar, Clock, ChevronRight, Activity, MapPin, Trash2, SlidersHorizontal } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useSocket } from '../hooks/useSocket';
import axios from 'axios';
import { API_URL } from '../constants/Config';
import FleetList from '../components/FleetList';
// DateTimePicker temporarily removed to prevent native crash

interface Vehicle {
    id: string;
    name: string;
    lat: number;
    lng: number;
    speed: number;
    trip_distance?: number;
    course?: number;
    alarm?: string;
    accStatus?: boolean;
    lastUpdate: Date | string;
    status: string;
    last_update?: string; // API uses this
    current_state?: 'moving' | 'idling' | 'parked' | 'offline';
    state_start_time?: string | Date;
    internetStatus?: boolean;
    gpsStatus?: boolean;
}

interface HistoryPoint {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;
    id: string;
}

export default function Dashboard() {
    const router = useRouter();
    const socket = useSocket();
    const mapRef = useRef<any>(null);
    const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const lastTrackedVehicleId = useRef<string | null>(null);
    const [durationStr, setDurationStr] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list'); // Default to List

    // Duration Timer Logic for Selected Vehicle
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (selectedVehicle && vehicles[selectedVehicle.id]) {
            const v = vehicles[selectedVehicle.id];
            const startTime = v.state_start_time ? new Date(v.state_start_time).getTime() : Date.now();

            const updateDuration = () => {
                const now = Date.now();
                const diff = Math.max(0, now - startTime);

                const hours = Math.floor(diff / 3600000);
                const minutes = Math.floor((diff % 3600000) / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);

                if (hours > 0) {
                    setDurationStr(`${hours}h ${minutes}m`);
                } else if (minutes > 0) {
                    setDurationStr(`${minutes}m ${seconds}s`);
                } else {
                    setDurationStr(`${seconds}s`);
                }
            };

            updateDuration();
            interval = setInterval(updateDuration, 1000);
        } else {
            setDurationStr('');
        }

        return () => clearInterval(interval);
    }, [selectedVehicle, vehicles]);

    // Fetch initial devices
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                let token;
                if (Platform.OS !== 'web') {
                    token = await SecureStore.getItemAsync('auth_token');
                } else {
                    token = localStorage.getItem('auth_token');
                }
                if (!token) return;

                const res = await axios.get(`${API_URL}/api/devices`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const vehicleMap: Record<string, Vehicle> = {};
                res.data.forEach((d: any) => {
                    vehicleMap[d.device_id] = {
                        id: d.device_id,
                        name: d.name || `Vehicle ${d.device_id.slice(-4)}`,
                        lat: d.lat || 33.5731,
                        lng: d.lng || -7.5898,
                        speed: d.speed || 0,
                        trip_distance: d.trip_distance,
                        course: d.course,
                        accStatus: d.acc_status,
                        status: d.status || 'offline',
                        lastUpdate: d.last_update ? new Date(d.last_update) : new Date(),
                        last_update: d.last_update,
                        current_state: d.current_state,
                        state_start_time: d.state_start_time,
                        internetStatus: d.internet_status === 1 || d.internet_status === true,
                        gpsStatus: d.gps_status === 1 || d.gps_status === true
                    };
                });
                setVehicles(vehicleMap);
            } catch (err) {
                console.error('Failed to fetch devices:', err);
            }
        };

        fetchDevices();
        const interval = setInterval(fetchDevices, 30000); // Poll every 30s as fallback
        return () => clearInterval(interval);
    }, []);

    // Socket updates
    useEffect(() => {
        if (!socket) return;

        socket.on('position', (data: any) => {
            console.log('Mobile Socket Data:', data);

            setVehicles(prev => {
                const deviceId = data.deviceId;
                const existing = prev[deviceId];

                // Only update state_start_time if state actually changed
                const stateChanged = existing?.current_state !== data.state;
                const newStateStartTime = stateChanged ? data.stateStartTime : (existing?.state_start_time || data.stateStartTime);

                const updatedVehicle: Vehicle = {
                    id: deviceId,
                    name: existing?.name || `Vehicle ${deviceId.slice(-4)}`,
                    lat: data.lat,
                    lng: data.lng,
                    speed: data.speed,
                    trip_distance: data.tripDistance,
                    course: data.course,
                    alarm: data.alarm,
                    accStatus: data.accStatus,
                    lastUpdate: new Date(),
                    status: 'online',
                    last_update: new Date().toISOString(),
                    current_state: data.state, // Socket uses 'state'
                    state_start_time: newStateStartTime, // Only update if state changed!
                    internetStatus: data.internetStatus,
                    gpsStatus: data.gpsStatus
                };

                return {
                    ...prev,
                    [deviceId]: updatedVehicle
                };
            });
        });

        return () => {
            socket.off('position');
        };
    }, [socket]);

    const handleLogout = async () => {
        if (Platform.OS !== 'web') {
            await SecureStore.deleteItemAsync('auth_token');
        } else {
            localStorage.removeItem('auth_token');
        }
        router.replace('/');
    };

    const [historyPath, setHistoryPath] = useState<HistoryPoint[]>([]);
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const [pickerStep, setPickerStep] = useState<'start' | 'end'>('start');
    const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
    const [selectedPoints, setSelectedPoints] = useState<HistoryPoint[]>([]);

    const onDateSelect = (date: Date) => {
        if (pickerStep === 'start') {
            setCustomStartDate(date);
            setPickerStep('end');
        } else {
            setDatePickerVisible(false);
            if (customStartDate && selectedVehicle) {
                const start = customStartDate;
                start.setHours(0, 0, 0, 0); // Start of start day

                const end = date;
                end.setHours(23, 59, 59, 999); // End of end day

                fetchHistoryDirect(selectedVehicle.id, start, end);
            }
        }
    };

    const fetchHistoryDirect = async (vehicleId: string, start: Date, end: Date) => {
        try {
            let token;
            if (Platform.OS !== 'web') {
                token = await SecureStore.getItemAsync('auth_token');
            } else {
                token = localStorage.getItem('auth_token');
            }
            if (!token) return;

            const startISO = start.toISOString();
            const endISO = end.toISOString();

            console.log(`Fetching history for ${vehicleId} from ${startISO} to ${endISO}`);
            const res = await axios.get(`${API_URL}/api/devices/${vehicleId}/history`, {
                params: { start: startISO, end: endISO },
                headers: { Authorization: `Bearer ${token}` }
            });

            const path: HistoryPoint[] = res.data.map((p: any) => ({
                latitude: p.lat,
                longitude: p.lng,
                timestamp: p.timestamp,
                speed: p.speed,
                id: p.id || Math.random().toString()
            }));

            setHistoryPath(path);
            setSelectedPoints([]); // Reset selection on new fetch

            if (path.length > 0 && mapRef.current) {
                mapRef.current.fitToCoordinates(path, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true
                });
            } else {
                Alert.alert('Info', 'Aucun historique trouvé pour cette période.');
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            Alert.alert('Erreur', 'Impossible de récupérer l\'historique.');
        }
    }

    const fetchHistory = async (vehicleId: string, period: string) => {
        try {
            const now = new Date();
            let start = new Date();

            if (period === 'custom') {
                setPickerStep('start');
                setDatePickerVisible(true);
                return;
            }

            switch (period) {
                case 'today':
                    start.setHours(0, 0, 0, 0);
                    break;
                case '12h':
                    start.setHours(now.getHours() - 12);
                    break;
                case '6h':
                    start.setHours(now.getHours() - 6);
                    break;
            }

            // Add buffer to end time (e.g. +1 hour) to handle potential device/server clock skew
            const endBuffer = new Date(now.getTime() + 60 * 60 * 1000);
            fetchHistoryDirect(vehicleId, start, endBuffer);

        } catch (error) {
            console.error('Failed to prepare history fetch:', error);
        }
    };

    const handleVehiclePress = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setHistoryPath([]); // Clear previous history when selecting new vehicle
        setViewMode('map');
    };

    // Effect to handle map animation when switching views or when vehicle position updates
    useEffect(() => {
        if (viewMode === 'map' && selectedVehicle && mapRef.current && vehicles[selectedVehicle.id]) {
            const latestVehicleData = vehicles[selectedVehicle.id];

            if (latestVehicleData) {
                // Determine if we should animate (either new selection OR position changed significantly)
                const isNewSelection = selectedVehicle.id !== lastTrackedVehicleId.current;

                // For position updates, we only auto-follow if we are NOT in history mode
                if (historyPath.length === 0) {
                    mapRef.current.animateToRegion({
                        latitude: latestVehicleData.lat,
                        longitude: latestVehicleData.lng,
                        latitudeDelta: isNewSelection ? 0.02 : 0.01,
                        longitudeDelta: isNewSelection ? 0.02 : 0.01
                    }, 1000);
                }

                if (isNewSelection) {
                    lastTrackedVehicleId.current = selectedVehicle.id;
                }
            }
        }
    }, [viewMode, selectedVehicle, vehicles, historyPath]);

    const handlePointPress = (point: HistoryPoint) => {
        setSelectedPoints(prev => {
            const exists = prev.find(p => p.id === point.id);
            if (exists) return prev.filter(p => p.id !== point.id);
            if (prev.length >= 2) return [prev[1], point]; // Keep last two
            return [...prev, point];
        });
    };

    const calculateDistance = () => {
        if (selectedPoints.length !== 2) return null;
        const p1 = selectedPoints[0];
        const p2 = selectedPoints[1];

        const dist = getDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        const timeDiff = Math.abs(new Date(p1.timestamp).getTime() - new Date(p2.timestamp).getTime());
        const totalSeconds = Math.floor(timeDiff / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        return {
            dist: dist.toFixed(2),
            time: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
        };
    };

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    const DEFAULT_REGION = {
        latitude: 33.5731,
        longitude: -7.5898,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
    };

    const distanceData = calculateDistance();

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.header}>
                <View style={styles.headerContent}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>
                            {viewMode === 'list' ? 'Suivi de Flotte' : (selectedVehicle ? selectedVehicle.name : 'Carte')}
                        </Text>

                        {viewMode === 'map' && selectedVehicle && vehicles[selectedVehicle.id] && (
                            <View style={{ marginTop: 2 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{
                                            width: 6, height: 6, borderRadius: 3,
                                            backgroundColor: vehicles[selectedVehicle.id].speed > 0 ? '#10B981' : '#F59E0B',
                                            marginRight: 4
                                        }} />
                                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#111' }}>
                                            {vehicles[selectedVehicle.id].speed > 0 ? `${Math.round(vehicles[selectedVehicle.id].speed)} km/h` : 'Stop'}
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 12, color: '#ccc' }}>|</Text>
                                    <Text style={{
                                        fontSize: 11, fontWeight: '600',
                                        color: vehicles[selectedVehicle.id].accStatus ? '#10B981' : '#9CA3AF'
                                    }}>
                                        {vehicles[selectedVehicle.id].accStatus ? 'ACC ON' : 'ACC OFF'}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
                                    {vehicles[selectedVehicle.id].trip_distance !== undefined && (
                                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                            Trip: <Text style={{ color: '#7C3AED', fontWeight: 'bold' }}>{vehicles[selectedVehicle.id].trip_distance?.toFixed(1)}km</Text>
                                        </Text>
                                    )}
                                    {durationStr ? (
                                        <Text style={{ fontSize: 11, color: '#6B7280' }}>
                                            ({durationStr})
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        )}
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity
                            style={styles.toggleButton}
                            onPress={() => {
                                if (viewMode === 'list') {
                                    setSelectedVehicle(null);
                                    setHistoryPath([]);
                                    setSelectedPoints([]);
                                }
                                setViewMode(m => m === 'list' ? 'map' : 'list');
                            }}
                        >
                            {viewMode === 'list' ? <MapIcon size={20} color="#111" /> : <List size={20} color="#111" />}
                        </TouchableOpacity>
                        {viewMode === 'list' && (
                            <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                                <LogOut size={20} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>

            <View style={styles.contentContainer}>
                {viewMode === 'list' ? (
                    <View style={{ paddingTop: 80, flex: 1 }}>
                        <FleetList
                            vehicles={vehicles}
                            onVehiclePress={handleVehiclePress}
                        />
                    </View>
                ) : (
                    <View style={{ flex: 1 }}>
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            ref={mapRef}
                            style={styles.map}
                            initialRegion={DEFAULT_REGION}
                            showsUserLocation={true}
                            showsMyLocationButton={true}
                            mapType="hybrid"
                        >
                            {Object.values(vehicles).map(vehicle => (
                                <Marker
                                    key={vehicle.id}
                                    coordinate={{ latitude: vehicle.lat, longitude: vehicle.lng }}
                                    onPress={() => {
                                        setSelectedVehicle(vehicle);
                                        mapRef.current?.animateToRegion({
                                            latitude: vehicle.lat,
                                            longitude: vehicle.lng,
                                            latitudeDelta: 0.01,
                                            longitudeDelta: 0.01,
                                        }, 500);
                                    }}
                                >
                                    <View style={styles.markerContainer}>
                                        <View style={styles.markerBubble}>
                                            <Text style={styles.markerText}>{vehicle.name}</Text>
                                        </View>
                                        {vehicle.speed > 0 ? (
                                            <Navigation
                                                size={24}
                                                color="#10B981"
                                                fill="#10B981"
                                                style={{ transform: [{ rotate: `${vehicle.course || 0}deg` }] }}
                                            />
                                        ) : (
                                            <CircleParking size={24} color="#F59E0B" fill="#F59E0B" />
                                        )}
                                    </View>
                                </Marker>
                            ))}

                            {historyPath.length > 0 && (
                                <>
                                    <Polyline
                                        coordinates={historyPath.map(p => ({ latitude: p.latitude, longitude: p.longitude }))}
                                        strokeColor="#4F46E5"
                                        strokeWidth={4}
                                    />
                                    {historyPath.filter((_, i) => i % 10 === 0 || i === 0 || i === historyPath.length - 1).map((point, index) => {
                                        const isSelected = selectedPoints.some(p => p.id === point.id);
                                        return (
                                            <Marker
                                                key={`hist-${index}`}
                                                coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                                                anchor={{ x: 0.5, y: 0.5 }}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handlePointPress(point);
                                                }}
                                            >
                                                <View style={{
                                                    width: isSelected ? 16 : 8,
                                                    height: isSelected ? 16 : 8,
                                                    borderRadius: isSelected ? 8 : 4,
                                                    backgroundColor: isSelected ? '#EF4444' : 'rgba(79, 70, 229, 0.8)',
                                                    borderWidth: 1,
                                                    borderColor: 'white'
                                                }} />
                                            </Marker>
                                        );
                                    })}
                                </>
                            )}
                        </MapView>

                        {/* History Controls Overlay */}
                        {selectedVehicle && (
                            <View style={styles.overlayContainer}>
                                <View style={styles.historyCard}>
                                    <View style={styles.historyHeader}>
                                        <Activity size={16} color="#4F46E5" />
                                        <Text style={styles.historyTitle}>Historique & Analyse</Text>
                                        {historyPath.length > 0 && (
                                            <TouchableOpacity onPress={() => { setHistoryPath([]); setSelectedPoints([]); }}>
                                                <Trash2 size={16} color="#9CA3AF" />
                                            </TouchableOpacity>
                                        )}
                                    </View>

                                    <View style={styles.periodRow}>
                                        <TouchableOpacity style={styles.periodBtn} onPress={() => fetchHistory(selectedVehicle.id, '6h')}>
                                            <Text style={styles.periodText}>6h</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.periodBtn} onPress={() => fetchHistory(selectedVehicle.id, '12h')}>
                                            <Text style={styles.periodText}>12h</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.periodBtn} onPress={() => fetchHistory(selectedVehicle.id, 'today')}>
                                            <Text style={styles.periodText}>Aujourd'hui</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.periodBtn, styles.customBtn]} onPress={() => fetchHistory(selectedVehicle.id, 'custom')}>
                                            <Calendar size={14} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>

                                    {distanceData && (
                                        <View style={styles.analysisBox}>
                                            <View style={styles.analysisItem}>
                                                <MapPin size={14} color="#EF4444" />
                                                <Text style={styles.analysisText}>{distanceData.dist} km</Text>
                                            </View>
                                            <View style={styles.analysisItem}>
                                                <Clock size={14} color="#6B7280" />
                                                <Text style={styles.analysisText}>{distanceData.time}</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Custom Date Picker Modal */}
                        <Modal visible={datePickerVisible} transparent animationType="fade">
                            <View style={styles.modalBg}>
                                <View style={styles.modalContent}>
                                    <Text style={styles.modalTitle}>Sélectionner {pickerStep === 'start' ? 'Début' : 'Fin'}</Text>
                                    <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ color: '#6B7280', textAlign: 'center' }}>
                                            Recherche du calendrier...
                                            {"\n"}
                                            (Nécessite une mise à jour de l'app)
                                        </Text>
                                    </View>
                                    <TouchableOpacity style={styles.closeBtn} onPress={() => setDatePickerVisible(false)}>
                                        <Text style={styles.closeBtnText}>Annuler</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 100, borderBottomWidth: 1, borderBottomColor: '#F3F4F6'
    },
    headerContent: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12
    },
    headerTextContainer: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
    headerActions: { flexDirection: 'row', gap: 8 },
    toggleButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    logoutButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    contentContainer: { flex: 1 },
    map: { flex: 1 },
    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerBubble: {
        backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
    },
    markerText: { fontSize: 10, fontWeight: 'bold', color: '#374151' },
    overlayContainer: { position: 'absolute', bottom: 20, left: 16, right: 16 },
    historyCard: {
        backgroundColor: 'white', borderRadius: 20, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5
    },
    historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    historyTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: '#374151' },
    periodRow: { flexDirection: 'row', gap: 8 },
    periodBtn: {
        flex: 1, height: 34, borderRadius: 10, backgroundColor: '#F3F4F6',
        justifyContent: 'center', alignItems: 'center'
    },
    periodText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
    customBtn: { backgroundColor: '#4F46E5', flex: 0.5 },
    analysisBox: {
        marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6',
        flexDirection: 'row', justifyContent: 'space-around'
    },
    analysisItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    analysisText: { fontSize: 12, fontWeight: '600', color: '#374151' },
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 24, padding: 24, width: '85%' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
    closeBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
    closeBtnText: { color: '#6B7280', fontWeight: '600' }
});
