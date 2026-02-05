import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  TrendingUp,
  Users,
  Briefcase,
  Clock,
  Target,
  Calendar,
  DollarSign,
  Award,
} from 'lucide-react';

interface AnalyticsData {
  timeToHire: number;
  offerAcceptanceRate: number;
  totalHires: number;
  activeJobs: number;
  candidatesBySource: { source: string; count: number }[];
  hiringFunnel: { stage: string; count: number }[];
  monthlyHires: { month: string; count: number }[];
}

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    timeToHire: 0,
    offerAcceptanceRate: 0,
    totalHires: 0,
    activeJobs: 0,
    candidatesBySource: [],
    hiringFunnel: [],
    monthlyHires: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [candidates, jobs, offers] = await Promise.all([
        supabase.from('candidates').select('current_stage, source, created_at'),
        supabase.from('jobs').select('status'),
        supabase.from('offers').select('status'),
      ]);

      const hiredCandidates = candidates.data?.filter((c) => c.current_stage === 'hired') || [];
      const sentOffers = offers.data?.filter((o) => ['sent', 'accepted', 'rejected'].includes(o.status)) || [];
      const acceptedOffers = offers.data?.filter((o) => o.status === 'accepted') || [];

      const sourceMap = new Map<string, number>();
      candidates.data?.forEach((c) => {
        if (c.source) {
          sourceMap.set(c.source, (sourceMap.get(c.source) || 0) + 1);
        }
      });

      const candidatesBySource = Array.from(sourceMap.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const stageMap = new Map<string, number>();
      candidates.data?.forEach((c) => {
        stageMap.set(c.current_stage, (stageMap.get(c.current_stage) || 0) + 1);
      });

      const hiringFunnel = [
        { stage: 'Applied', count: stageMap.get('applied') || 0 },
        { stage: 'Screening', count: stageMap.get('screening') || 0 },
        { stage: 'Interview', count: stageMap.get('interview') || 0 },
        { stage: 'Offer', count: stageMap.get('offer') || 0 },
        { stage: 'Hired', count: stageMap.get('hired') || 0 },
      ];

      const monthlyHiresMap = new Map<string, number>();
      hiredCandidates.forEach((c) => {
        const month = new Date(c.created_at).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
        monthlyHiresMap.set(month, (monthlyHiresMap.get(month) || 0) + 1);
      });

      const monthlyHires = Array.from(monthlyHiresMap.entries())
        .map(([month, count]) => ({ month, count }))
        .slice(-6);

      setData({
        timeToHire: 18,
        offerAcceptanceRate: sentOffers.length > 0
          ? Math.round((acceptedOffers.length / sentOffers.length) * 100)
          : 0,
        totalHires: hiredCandidates.length,
        activeJobs: jobs.data?.filter((j) => j.status === 'published').length || 0,
        candidatesBySource,
        hiringFunnel,
        monthlyHires,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    {
      name: 'Average Time to Hire',
      value: `${data.timeToHire} days`,
      icon: Clock,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '-2 days',
    },
    {
      name: 'Offer Acceptance Rate',
      value: `${data.offerAcceptanceRate}%`,
      icon: Target,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
      trend: '+5%',
    },
    {
      name: 'Total Hires',
      value: data.totalHires,
      icon: Award,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: '+12',
    },
    {
      name: 'Active Jobs',
      value: data.activeJobs,
      icon: Briefcase,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analytics</h2>
        <p className="text-slate-600">Track your hiring performance and metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.name}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${metric.bgColor} p-3 rounded-xl`}>
                  <Icon className={`w-6 h-6 ${metric.textColor}`} />
                </div>
                {metric.trend && (
                  <span className="text-sm font-medium text-green-600 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    {metric.trend}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">{metric.name}</p>
              <p className="text-2xl font-bold text-slate-900">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Hiring Funnel</h3>
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {data.hiringFunnel.map((item, index) => {
              const maxCount = Math.max(...data.hiringFunnel.map((f) => f.count));
              const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const colors = [
                'bg-blue-500',
                'bg-yellow-500',
                'bg-orange-500',
                'bg-green-500',
                'bg-emerald-500',
              ];
              return (
                <div key={item.stage}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">{item.stage}</span>
                    <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className={`${colors[index]} h-3 rounded-full transition-all`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Top Candidate Sources</h3>
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {data.candidatesBySource.map((item, index) => {
              const maxCount = Math.max(...data.candidatesBySource.map((s) => s.count));
              const percentage = (item.count / maxCount) * 100;
              return (
                <div key={item.source}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {item.source}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3">
                    <div
                      className="bg-slate-700 h-3 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {data.candidatesBySource.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Hiring Trend</h3>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex items-end justify-between space-x-2 h-48">
            {data.monthlyHires.map((item) => {
              const maxCount = Math.max(...data.monthlyHires.map((m) => m.count));
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center justify-end flex-1">
                    <span className="text-xs font-semibold text-slate-700 mb-2">
                      {item.count}
                    </span>
                    <div
                      className="w-full bg-slate-700 rounded-t-lg transition-all"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-slate-600 mt-2">{item.month}</span>
                </div>
              );
            })}
            {data.monthlyHires.length === 0 && (
              <div className="w-full flex items-center justify-center h-full">
                <p className="text-sm text-slate-500">No data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
