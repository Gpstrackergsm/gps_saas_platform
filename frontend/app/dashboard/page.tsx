"use client"

import dynamic from 'next/dynamic';

// Map must be client-side only due to Leaflet generic window usage
const MapComponent = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500">Loading Map...</div>
});

export default function DashboardPage() {
    return (
        <div className="w-full h-full relative">
            <div className="absolute top-4 left-4 z-10">
                <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
            </div>

            <MapComponent />
        </div>
    );
}
