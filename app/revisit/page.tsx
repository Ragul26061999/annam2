'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    RefreshCw,
    Plus,
    Search,
    Calendar,
    User,
    Stethoscope,
    Clock,
    TrendingUp,
    Users,
    Activity
} from 'lucide-react';
import { getRecentRevisits, getRevisitStats } from '../../src/lib/revisitService';

export default function RevisitDashboard() {
    const router = useRouter();
    const [revisits, setRevisits] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, thisMonth: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadData();

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            loadData();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [revisitData, statsData] = await Promise.all([
                getRecentRevisits(50),
                getRevisitStats()
            ]);
            setRevisits(revisitData);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading revisit data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredRevisits = revisits.filter(revisit => {
        const search = searchTerm.toLowerCase();
        return (
            revisit.uhid?.toLowerCase().includes(search) ||
            revisit.patient?.name?.toLowerCase().includes(search) ||
            revisit.reason_for_visit?.toLowerCase().includes(search)
        );
    });

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
                            <RefreshCw className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Patient Revisits</h1>
                            <p className="text-gray-600">Track and manage returning patients</p>
                        </div>
                    </div>
                    <Link
                        href="/revisit/create"
                        className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
                    >
                        <Plus size={20} />
                        New Revisit
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Total Revisits</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.total}</p>
                            </div>
                            <div className="p-3 bg-purple-100 rounded-xl">
                                <Users className="h-6 w-6 text-purple-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-cyan-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Today's Revisits</p>
                                <p className="text-3xl font-bold text-cyan-600 mt-2">{stats.today}</p>
                            </div>
                            <div className="p-3 bg-cyan-100 rounded-xl">
                                <Activity className="h-6 w-6 text-cyan-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 font-medium">This Month</p>
                                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.thisMonth}</p>
                            </div>
                            <div className="p-3 bg-blue-100 rounded-xl">
                                <TrendingUp className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by UHID, patient name, or reason..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                        />
                    </div>
                </div>

                {/* Revisits Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900">Recent Revisits</h2>
                    </div>

                    {loading ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-gray-600">Loading revisits...</p>
                        </div>
                    ) : filteredRevisits.length === 0 ? (
                        <div className="p-12 text-center">
                            <RefreshCw className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-600">No revisits found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Date & Time
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            UHID
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Patient
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Reason for Visit
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Visit Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                            Fee
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRevisits.map((revisit) => (
                                        <tr key={revisit.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="h-4 w-4 text-gray-400" />
                                                    <span>{formatDate(revisit.visit_date)}</span>
                                                    <Clock className="h-4 w-4 text-gray-400 ml-2" />
                                                    <span>{revisit.visit_time}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono font-semibold text-cyan-600">
                                                    {revisit.uhid}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-4 w-4 text-gray-400" />
                                                    <span className="font-medium text-gray-900">
                                                        {revisit.patient?.name || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700">
                                                    {revisit.reason_for_visit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-700">
                                                    {revisit.visit_type || 'follow-up'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-semibold text-green-600">
                                                    ₹{revisit.consultation_fee || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
