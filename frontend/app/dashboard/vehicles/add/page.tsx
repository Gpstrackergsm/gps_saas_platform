"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AddDevicePage() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            await api.post('/devices', data);
            router.push('/dashboard/vehicles');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to add device');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 h-full bg-zinc-950 text-white">
            <Link href="/dashboard/vehicles" className="flex items-center text-zinc-400 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
            </Link>

            <div className="max-w-xl">
                <h1 className="text-3xl font-bold mb-2">Add New Vehicle</h1>
                <p className="text-zinc-400 mb-8">Register a new GPS tracker to your fleet.</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-zinc-900 p-8 rounded-xl border border-zinc-800">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Vehicle Name</label>
                        <Input
                            {...register('name')}
                            placeholder="e.g. Delivery Truck 1"
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Tracker Device ID (IMEI)</label>
                        <Input
                            {...register('deviceId', { required: true })}
                            placeholder="e.g. 123456789012345"
                            className="bg-zinc-800 border-zinc-700 font-mono"
                        />
                        {errors.deviceId && <span className="text-xs text-red-500">Device ID is required</span>}
                        <p className="text-xs text-zinc-500">Usually found on the sticker of the GPS device.</p>
                    </div>

                    {error && <div className="text-red-500 text-sm">{error}</div>}

                    <div className="pt-4 flex gap-4">
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={loading}>
                            {loading ? 'Adding...' : 'Add Vehicle'}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.back()} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
