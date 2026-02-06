"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, User, Building } from "lucide-react";

export default function SettingsPage() {
    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: "", message: "" });
    const [userEmail, setUserEmail] = useState("");

    useEffect(() => {
        // Mock fetch initial data or use stored token info
        // In a real app we'd fetch GET /api/auth/profile
        // For now, let's just allow updating.
        const token = localStorage.getItem('token');
        if (token) {
            // We could decode token to get email but let's just leave it blank or fetch
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: "", message: "" });

        try {
            await api.put('/auth/profile', {
                companyName: companyName || undefined,
                phone: phone || undefined,
                password: password || undefined
            });
            setStatus({ type: "success", message: "Profile updated successfully!" });
            setPassword(""); // Clear password field
        } catch (err) {
            console.error(err);
            setStatus({ type: "error", message: "Failed to update profile." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto space-y-8">
            <header>
                <h2 className="text-3xl font-bold text-white">Account Settings</h2>
                <p className="text-zinc-400">Update your company details and security preferences.</p>
            </header>

            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="text-sm font-medium text-zinc-300 mb-2 block flex items-center gap-2">
                            <Building size={16} />
                            Company Name
                        </label>
                        <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="Enter new company name"
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-zinc-300 mb-2 block flex items-center gap-2">
                            <User size={16} />
                            Change Password
                        </label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter new password (leave empty to keep current)"
                            className="bg-zinc-800 border-zinc-700 text-white"
                        />
                    </div>

                    {status.message && (
                        <div className={`p-4 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                            {status.message}
                        </div>
                    )}

                    <div className="pt-4">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
                        >
                            <Save size={20} />
                            {loading ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
