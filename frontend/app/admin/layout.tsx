"use client";

import { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, Users, Building, LogOut, ArrowLeft } from 'lucide-react';

export default function AdminLayout({ children }: { children: ReactNode }) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-red-900/30 bg-zinc-900/50 flex flex-col">
                <div className="p-6 border-b border-red-900/20">
                    <h1 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                        <Shield />
                        ADMIN
                    </h1>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {/* Links cleared as requested */}
                </nav>

                <div className="p-4 border-t border-red-900/20 space-y-2">
                    <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 w-full text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg transition-colors text-sm">
                        <ArrowLeft size={16} />
                        Back to Map
                    </Link>

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
            <main className="flex-1 flex flex-col relative overflow-auto bg-zinc-950">
                {children}
            </main>
        </div>
    );
}
