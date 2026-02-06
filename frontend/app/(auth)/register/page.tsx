"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const onSubmit = async (data: any) => {
        setLoading(true);
        setError('');
        try {
            await api.post('/auth/register', data);
            // On success, redirect to login with a query param to show success message?
            // Or just push to login
            router.push('/login');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4 relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393798-3828fb4090bb?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="z-10 w-full max-w-md space-y-8 p-8 bg-zinc-900/80 backdrop-blur-md rounded-2xl border border-zinc-800 shadow-2xl"
            >
                <div className="text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-white">Create Account</h2>
                    <p className="mt-2 text-sm text-zinc-400">Launch your GPS tracking platform</p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <Input
                                {...register('companyName', { required: true })}
                                placeholder="Company Name"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                            />
                            {errors.companyName && <span className="text-xs text-red-500">Company Name is required</span>}
                        </div>
                        <div>
                            <Input
                                {...register('email', { required: true })}
                                type="email"
                                placeholder="Email Address"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                            />
                            {errors.email && <span className="text-xs text-red-500">Email is required</span>}
                        </div>
                        <div>
                            <Input
                                {...register('password', { required: true })}
                                type="password"
                                placeholder="Password"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                            />
                            {errors.password && <span className="text-xs text-red-500">Password is required</span>}
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm italic text-center">{error}</div>}

                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 text-lg"
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>

                    <div className="text-center text-sm">
                        <span className="text-zinc-500">Already have an account? </span>
                        <Link href="/login" className="font-medium text-blue-500 hover:text-blue-400">Sign in</Link>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}
