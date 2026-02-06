"use client"

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Position {
    id: number;
    lat: number;
    lng: number;
    speed: number;
    timestamp: string;
}

interface Device {
    device_id: string;
    name: string;
}

export default function HistoryPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [history, setHistory] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch devices for dropdown
        api.get('/devices').then(res => setDevices(res.data)).catch(console.error);
    }, []);

    const fetchHistory = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        try {
            // Default to last 24 hours if no date picker yet
            const end = new Date();
            const start = new Date(end.getTime() - 24 * 60 * 60 * 1000); // 24h ago

            const res = await api.get(`/devices/${selectedDevice}/history`, {
                params: {
                    start: start.toISOString(),
                    end: end.toISOString()
                }
            });
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 h-full bg-zinc-950 text-white overflow-y-auto">
            <h1 className="text-3xl font-bold mb-2">History & Reports</h1>
            <p className="text-zinc-400 mb-8">Analyze vehicle routes and activity.</p>

            <div className="flex gap-4 mb-8 bg-zinc-900 p-6 rounded-xl border border-zinc-800">
                <select
                    className="bg-zinc-800 text-white p-2 rounded-md border border-zinc-700 min-w-[200px]"
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                >
                    <option value="">Select Vehicle...</option>
                    {devices.map(d => (
                        <option key={d.device_id} value={d.device_id}>{d.name || d.device_id}</option>
                    ))}
                </select>

                <Button onClick={fetchHistory} disabled={!selectedDevice || loading} className="bg-blue-600 hover:bg-blue-500">
                    {loading ? 'Loading...' : 'Generate Report'}
                </Button>
            </div>

            {/* Results Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-950/50 text-zinc-400 text-sm uppercase">
                        <tr>
                            <th className="p-4">Time</th>
                            <th className="p-4">Speed (km/h)</th>
                            <th className="p-4">Latitude</th>
                            <th className="p-4">Longitude</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {history.length === 0 ? (
                            <tr><td colSpan={4} className="p-8 text-center text-zinc-500">No history data found for this period.</td></tr>
                        ) : (
                            history.map((pos) => (
                                <tr key={pos.id} className="hover:bg-zinc-800/50">
                                    <td className="p-4 text-zinc-300">{new Date(pos.timestamp).toLocaleString()}</td>
                                    <td className="p-4 font-mono text-blue-400">{pos.speed.toFixed(1)}</td>
                                    <td className="p-4 text-zinc-500">{pos.lat.toFixed(6)}</td>
                                    <td className="p-4 text-zinc-500">{pos.lng.toFixed(6)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
