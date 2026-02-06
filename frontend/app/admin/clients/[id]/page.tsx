"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Smartphone, Plus, Car, Trash2, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClientDetailPage() {
    const params = useParams();
    const router = useRouter();
    const clientId = params.id;

    const [client, setClient] = useState<any>(null);
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Assignment State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [deviceId, setDeviceId] = useState("");
    const [deviceName, setDeviceName] = useState("");
    const [simPhone, setSimPhone] = useState("");
    const [assignStatus, setAssignStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [assignError, setAssignError] = useState("");

    // Edit State
    const [editingDevice, setEditingDevice] = useState<any | null>(null);

    useEffect(() => {
        fetchClientDetails();
    }, [clientId]);

    const fetchClientDetails = async () => {
        try {
            const res = await api.get(`/admin/clients/${clientId}`);
            setClient(res.data.client);
            setDevices(res.data.devices);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load client details.");
        } finally {
            setLoading(false);
        }
    };

    const handleAssignDevice = async (e: React.FormEvent) => {
        e.preventDefault();
        setAssignStatus("loading");
        setAssignError("");

        try {
            if (editingDevice) {
                // UPDATE Mode
                await api.put(`/admin/devices/${editingDevice.id}`, {
                    deviceId,
                    name: deviceName,
                    simPhone
                });
            } else {
                // CREATE Mode
                await api.post('/admin/devices', {
                    deviceId,
                    name: deviceName,
                    tenantId: client.tenant_id,
                    simPhone
                });
            }

            setAssignStatus("success");
            setDeviceId("");
            setDeviceName("");
            setSimPhone("");
            fetchClientDetails(); // Refresh list
            setTimeout(() => {
                setAssignStatus("idle");
                setShowAssignModal(false);
                setEditingDevice(null);
            }, 1000);
        } catch (err: any) {
            console.error(err);
            setAssignStatus("error");
            setAssignError(err.response?.data?.error || "Failed to save device");
        }
    };

    const handleDeleteDevice = async () => {
        if (!confirm("Are you sure you want to delete this device? This action cannot be undone.")) return;

        setAssignStatus("loading");
        try {
            await api.delete(`/admin/devices/${editingDevice.id}`);
            setAssignStatus("success");
            fetchClientDetails();
            setTimeout(() => {
                setAssignStatus("idle");
                setShowAssignModal(false);
                setEditingDevice(null);
            }, 1000);
        } catch (err: any) {
            console.error(err);
            setAssignStatus("error");
            setAssignError(err.response?.data?.error || "Failed to delete device");
        }
    };

    const openEditModal = (device: any) => {
        setEditingDevice(device);
        setDeviceId(device.device_id);
        setDeviceName(device.name);
        setSimPhone(device.sim_phone || "");
        setAssignStatus("idle");
        setAssignError("");
        setShowAssignModal(true);
    };

    const openAssignModal = () => {
        setEditingDevice(null);
        setDeviceId("");
        setDeviceName("");
        setSimPhone("");
        setAssignStatus("idle");
        setAssignError("");
        setShowAssignModal(true);
    };

    if (loading) return <div className="p-8 text-white">Loading client details...</div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;
    if (!client) return <div className="p-8 text-white">Client not found.</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            {/* Header / Back */}
            <div className="flex items-center gap-4 mb-8">
                <Button
                    variant="ghost"
                    onClick={() => router.back()}
                    className="text-zinc-400 hover:text-white"
                >
                    <ArrowLeft size={20} className="mr-2" /> Back
                </Button>
                <div>
                    <h2 className="text-3xl font-bold text-white">{client.company_name}</h2>
                    <p className="text-zinc-400">{client.email}</p>
                </div>
            </div>

            {/* Stats / Info Cards */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h4 className="text-zinc-500 text-sm font-medium uppercase mb-2">Contact Phone</h4>
                    <p className="text-xl text-white font-mono">{client.phone || "N/A"}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h4 className="text-zinc-500 text-sm font-medium uppercase mb-2">Total Vehicles</h4>
                    <p className="text-xl text-white font-mono flex items-center gap-2">
                        <Car className="text-blue-500" /> {devices.length}
                    </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl">
                    <h4 className="text-zinc-500 text-sm font-medium uppercase mb-2">Tenant ID</h4>
                    <p className="text-xl text-white font-mono">{client.tenant_id}</p>
                </div>
            </div>

            {/* Devices List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Smartphone className="text-green-500" />
                        Assigned Devices
                    </h3>
                    <Button
                        onClick={openAssignModal}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold"
                    >
                        <Plus size={18} className="mr-2" /> Add Device
                    </Button>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-zinc-400">
                        <thead className="bg-zinc-800/80 text-zinc-200 uppercase font-medium">
                            <tr>
                                <th className="px-6 py-4">Vehicle Name</th>
                                <th className="px-6 py-4">IMEI (Device ID)</th>
                                <th className="px-6 py-4">SIM Phone</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {devices.map((device) => (
                                <tr key={device.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{device.name}</td>
                                    <td className="px-6 py-4 font-mono">{device.device_id}</td>
                                    <td className="px-6 py-4 font-mono text-blue-300">{device.sim_phone || "-"}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-400 border border-green-800">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                            onClick={() => openEditModal(device)}
                                        >
                                            <Pencil size={16} className="mr-2" /> Edit
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {devices.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 italic">
                                        No devices assigned to this client yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ASSIGN MODAL */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Smartphone className="text-green-500" />
                                    {editingDevice ? "Edit Device" : "Assign Device"}
                                </h3>
                                <p className="text-sm text-zinc-400 mt-1">
                                    {editingDevice ? "Updating" : "Adding to"} <span className="text-white font-medium">{client.company_name}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAssignModal(false)}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAssignDevice} className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-zinc-300 block mb-2">Device ID (IMEI)</label>
                                    <Input
                                        value={deviceId}
                                        onChange={(e) => setDeviceId(e.target.value)}
                                        placeholder="e.g. 123456789012345"
                                        className="bg-zinc-800 border-zinc-700 text-white h-12"
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-300 block mb-2">Vehicle Name</label>
                                    <Input
                                        value={deviceName}
                                        onChange={(e) => setDeviceName(e.target.value)}
                                        placeholder="e.g. White Truck 05"
                                        className="bg-zinc-800 border-zinc-700 text-white h-12"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-zinc-300 block mb-2">SIM Phone Number</label>
                                    <Input
                                        value={simPhone}
                                        onChange={(e) => setSimPhone(e.target.value)}
                                        placeholder="e.g. 0612345678"
                                        className="bg-zinc-800 border-zinc-700 text-white h-12"
                                        required
                                    />
                                </div>

                                <div className="pt-4 flex flex-col gap-3">
                                    <Button
                                        type="submit"
                                        disabled={assignStatus === "loading"}
                                        className={`w-full h-12 font-bold ${assignStatus === "success" ? "bg-green-600 hover:bg-green-500" :
                                            assignStatus === "error" ? "bg-red-600 hover:bg-red-500" :
                                                "bg-green-600 hover:bg-green-500"
                                            }`}
                                    >
                                        {assignStatus === "loading" ? "Assigning..." :
                                            assignStatus === "success" ? "Success!" :
                                                assignStatus === "error" ? "Retry" :
                                                    editingDevice ? "Update Device" : "Assign Device"
                                        }
                                    </Button>

                                    {assignStatus === "error" && (
                                        <p className="text-center text-sm text-red-500 font-medium animate-in fade-in slide-in-from-top-1">
                                            {assignError}
                                        </p>
                                    )}

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setShowAssignModal(false)}
                                        className="w-full h-10 text-zinc-500 hover:text-white"
                                    >
                                        Cancel
                                    </Button>

                                    {editingDevice && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={handleDeleteDevice}
                                            className="w-full h-10 text-red-500 hover:text-red-400 hover:bg-red-950/30"
                                        >
                                            <Trash2 size={16} className="mr-2" /> Delete Device
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
