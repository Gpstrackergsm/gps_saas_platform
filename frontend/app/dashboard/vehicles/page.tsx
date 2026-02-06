"use client"

import { useEffect, useState } from 'react';
import { Plus, Search, MoreVertical, Wifi, WifiOff } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

interface Device {
    id: number;
    device_id: string;
    name: string | null;
    status: 'online' | 'offline';
    last_seen: string;
}

export default function DevicesPage() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await api.get('/devices');
            setDevices(res.data);
        } catch (err) {
            console.error('Failed to fetch devices', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredDevices = devices.filter(d =>
        d.device_id.includes(search) || (d.name && d.name.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 h-full bg-zinc-950 text-white overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Vehicles</h1>
                    <p className="text-zinc-400">Manage your fleet trackers</p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 h-4 w-4" />
                <Input
                    placeholder="Search by ID or Name..."
                    className="pl-10 bg-zinc-900 border-zinc-800 text-white w-full max-w-md"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Device List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-zinc-950/50 text-zinc-400 text-sm uppercase tracking-wider">
                        <tr>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium">Vehicle Name</th>
                            <th className="p-4 font-medium">Tracker ID</th>
                            <th className="p-4 font-medium">Last Seen</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-500">Loading fleet...</td></tr>
                        ) : filteredDevices.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No vehicles found.</td></tr>
                        ) : (
                            filteredDevices.map((device) => (
                                <tr key={device.id} className="hover:bg-zinc-800/50 transition-colors">
                                    <td className="p-4">
                                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full w-fit text-xs font-medium ${device.status === 'online'
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                                            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                            }`}>
                                            {device.status === 'online' ? <Wifi size={12} /> : <WifiOff size={12} />}
                                            {device.status.toUpperCase()}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-white">{device.name || 'Unnamed Vehicle'}</td>
                                    <td className="p-4 font-mono text-zinc-400">{device.device_id}</td>
                                    <td className="p-4 text-zinc-500 text-sm">
                                        {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                                            <MoreVertical size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
