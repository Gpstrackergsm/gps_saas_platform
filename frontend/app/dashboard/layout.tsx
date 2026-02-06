"use client";

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Map, Settings, LogOut, Truck, Menu, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [role, setRole] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Hidden by default

    useEffect(() => {
        const storedRole = localStorage.getItem('role');
        console.log('Dashboard Layout Mounted. Stored Role:', storedRole);
        setRole(storedRole);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-zinc-950 text-white overflow-hidden relative">
            {/* Sidebar */}
            <aside
                className={`
                    absolute top-0 left-0 h-full z-50 bg-zinc-900 border-r border-zinc-800 transition-all duration-300 ease-in-out
                    ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'}
                `}
            >
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                        GPS PRO
                    </h1>
                    <button onClick={() => setIsSidebarOpen(false)} className="text-zinc-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <Map size={20} />
                        Live Map
                    </Link>
                    <Link href="/dashboard/vehicles" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <Truck size={20} />
                        Vehicles
                    </Link>
                    <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                        <Settings size={20} />
                        Settings
                    </Link>
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative w-full h-full">
                {/* Toggle Button (Always visible) */}
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="absolute top-4 left-4 z-[60] bg-zinc-900/80 p-2 rounded-md text-white hover:bg-zinc-800 transition-colors shadow-lg backdrop-blur border border-zinc-700"
                    aria-label="Open Menu"
                    style={{ display: isSidebarOpen ? 'none' : 'block' }} // Hide when open to avoid clutter, or rely on sidebar covering it? 
                // Sidebar is absolute z-50. Button is z-60. 
                // Let's keep it simple: Show button only when closed.
                >
                    <Menu size={20} />
                </button>

                {children}

                {/* Overlay to close sidebar when clicking outside */}
                {isSidebarOpen && (
                    <div
                        className="absolute inset-0 bg-black/50 z-40"
                        onClick={() => setIsSidebarOpen(false)}
                    ></div>
                )}
            </main>
        </div>
    );
}
