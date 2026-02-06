"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Search, User, Car, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export default function AdminPage() {
    const router = useRouter();
    const [emailQuery, setEmailQuery] = useState("");
    const [users, setUsers] = useState<any[]>([]); // Search results
    const [allClients, setAllClients] = useState<any[]>([]); // Full list
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const res = await api.get('/admin/clients');
            setAllClients(res.data);
        } catch (err) {
            console.error("Failed to fetch clients", err);
        }
    };

    const searchUsers = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.get(`/admin/users/search?email=${emailQuery}`);
            setUsers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white">Client Directory</h2>
                <p className="text-zinc-400">Manage clients and their devices.</p>
            </header>

            {/* Client List & Search Workspace */}
            <div className="space-y-8">
                {/* Search Section */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Find Client</h3>
                    <form onSubmit={searchUsers} className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                            <Input
                                value={emailQuery}
                                onChange={(e) => setEmailQuery(e.target.value)}
                                placeholder="Search by email..."
                                className="bg-zinc-800 border-zinc-700 pl-10 text-white"
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500">
                            {loading ? "..." : "Search"}
                        </Button>
                    </form>

                    {/* Search Results */}
                    {users.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {users.map(user => (
                                <div
                                    key={user.id}
                                    className="p-3 rounded-lg border bg-zinc-800 border-zinc-700 hover:border-zinc-600 cursor-pointer flex justify-between items-center"
                                    onClick={() => router.push(`/admin/clients/${user.id}`)}
                                >
                                    <div>
                                        <p className="text-white font-medium">{user.email}</p>
                                        <p className="text-xs text-zinc-400">{user.company_name}</p>
                                    </div>
                                    <Button size="sm" variant="secondary" className="bg-zinc-700 hover:bg-zinc-600">
                                        Manage
                                        <ArrowRight size={14} className="ml-1" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Full Client List */}
                <div>
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <User className="text-blue-400" />
                        All Clients ({allClients.length})
                    </h3>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm text-zinc-400">
                            <thead className="bg-zinc-800/80 text-zinc-200 uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-4">Company</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Phone</th>
                                    <th className="px-6 py-4 text-center">Vehicles</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {allClients.map((client) => (
                                    <tr
                                        key={client.id}
                                        className="hover:bg-zinc-800/30 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/admin/clients/${client.id}`)}
                                    >
                                        <td className="px-6 py-4 font-medium text-white">{client.company_name}</td>
                                        <td className="px-6 py-4">{client.email}</td>
                                        <td className="px-6 py-4 text-zinc-300">{client.phone || '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-md text-white font-mono">
                                                <Car size={14} /> {client.vehicle_count}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                            >
                                                Manage <ArrowRight size={14} className="ml-1" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {allClients.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500 italic">
                                            No clients found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
