import Link from "next/link";
import { ArrowRight, MapPin, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">

        {/* Abstract Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black z-0" />

        <div className="z-10 max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 border border-zinc-800 text-sm text-zinc-400 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            System Online & Operational
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
            The World's Most <br />
            Advanced GPS Platform
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200 fill-mode-both">
            Real-time telemetry, historical playback, and enterprise-grade fleet management.
            Designed for scale. Built for speed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-500 fill-mode-both">
            <Link href="/login">
              <Button size="lg" className="bg-white text-black hover:bg-zinc-200 text-lg px-8 py-6 rounded-full">
                Launch Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8 p-12 border-t border-zinc-900 z-10 bg-black/50 backdrop-blur-sm">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
            <MapPin size={32} />
          </div>
          <h3 className="text-xl font-semibold">Real-time Precision</h3>
          <p className="text-zinc-500">Sub-second latency updates via Socket.io engine.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500">
            <Activity size={32} />
          </div>
          <h3 className="text-xl font-semibold">Live Telemetry</h3>
          <p className="text-zinc-500">Monitor speed, direction, and status instantly.</p>
        </div>
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-green-500/10 rounded-xl text-green-500">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-semibold">Enterprise Security</h3>
          <p className="text-zinc-500">Role-based access control and encrypted archival.</p>
        </div>
      </section>
    </div>
  );
}
