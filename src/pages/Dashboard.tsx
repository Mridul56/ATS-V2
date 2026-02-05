import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase, Users, Calendar, TrendingUp, Clock, CheckCircle, MessageSquare, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react';

interface Stats {
  totalJobs: number;
  activeJobs: number;
  totalCandidates: number;
  upcomingInterviews: number;
  pendingOffers: number;
  hiredThisMonth: number;
}

interface InterviewFeedback {
  id: string;
  candidate_name: string;
  job_title: string;
  round_number: number;
  rating: number;
  feedback: string;
  result: string;
  interviewer_name: string;
  created_at: string;
}

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    upcomingInterviews: 0,
    pendingOffers: 0,
    hiredThisMonth: 0,
  });
  const [recentFeedback, setRecentFeedback] = useState<InterviewFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    if (profile?.role === 'recruiter' || profile?.role === 'admin') {
      loadRecentFeedback();
    }
  }, [profile]);

  const loadStats = async () => {
    try {
      const [jobs, candidates, interviews, offers] = await Promise.all([
        supabase.from('jobs').select('status', { count: 'exact' }),
        supabase.from('candidates').select('current_stage', { count: 'exact' }),
        supabase.from('interview_schedules').select('status, scheduled_at', { count: 'exact' }),
        supabase.from('offers').select('status', { count: 'exact' }),
      ]);

      const activeJobs = jobs.data?.filter(j => j.status === 'published').length || 0;
      const upcomingInterviews = interviews.data?.filter(i =>
        i.status === 'scheduled' && i.scheduled_at && new Date(i.scheduled_at) > new Date()
      ).length || 0;
      const pendingOffers = offers.data?.filter(o => o.status === 'sent').length || 0;
      const hiredThisMonth = candidates.data?.filter(c => {
        return c.current_stage === 'hired';
      }).length || 0;

      setStats({
        totalJobs: jobs.count || 0,
        activeJobs,
        totalCandidates: candidates.count || 0,
        upcomingInterviews,
        pendingOffers,
        hiredThisMonth,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_schedules')
        .select(`
          id,
          round_number,
          rating,
          feedback,
          result,
          updated_at,
          candidates!interview_schedules_candidate_id_fkey(full_name),
          jobs!interview_schedules_job_id_fkey(title),
          profiles!interview_schedules_interviewer_id_fkey(full_name)
        `)
        .eq('status', 'completed')
        .not('feedback', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedFeedback = (data || []).map((item: any) => ({
        id: item.id,
        candidate_name: item.candidates?.full_name || 'Unknown',
        job_title: item.jobs?.title || 'Unknown',
        round_number: item.round_number,
        rating: item.rating,
        feedback: item.feedback,
        result: item.result,
        interviewer_name: item.profiles?.full_name || 'Unknown',
        created_at: item.updated_at,
      }));

      setRecentFeedback(formattedFeedback);
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const statCards = [
    {
      name: 'Active Jobs',
      value: stats.activeJobs,
      total: stats.totalJobs,
      icon: Briefcase,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Total Candidates',
      value: stats.totalCandidates,
      icon: Users,
      color: 'bg-green-500',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Upcoming Interviews',
      value: stats.upcomingInterviews,
      icon: Calendar,
      color: 'bg-orange-500',
      textColor: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      name: 'Pending Offers',
      value: stats.pendingOffers,
      icon: Clock,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      name: 'Hired This Month',
      value: stats.hiredThisMonth,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      name: 'Growth Rate',
      value: '+12%',
      icon: TrendingUp,
      color: 'bg-violet-500',
      textColor: 'text-violet-600',
      bgColor: 'bg-violet-50',
      isPercentage: true,
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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Overview</h2>
        <p className="text-slate-600">Your hiring metrics at a glance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-600 mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {stat.isPercentage ? stat.value : stat.value}
                  </p>
                  {stat.total !== undefined && (
                    <p className="text-sm text-slate-500 mt-1">of {stat.total} total</p>
                  )}
                </div>
                <div className={`${stat.bgColor} p-3 rounded-xl`}>
                  <Icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Recent Interview Feedback</h3>
            <MessageSquare className="w-5 h-5 text-slate-400" />
          </div>
          <div className="space-y-4">
            {recentFeedback.length > 0 ? (
              recentFeedback.slice(0, 5).map((feedback) => {
                const getResultIcon = () => {
                  if (feedback.result === 'passed') return <ThumbsUp className="w-4 h-4 text-green-600" />;
                  if (feedback.result === 'rejected') return <ThumbsDown className="w-4 h-4 text-red-600" />;
                  return <AlertCircle className="w-4 h-4 text-yellow-600" />;
                };

                const getResultColor = () => {
                  if (feedback.result === 'passed') return 'bg-green-50 border-green-200';
                  if (feedback.result === 'rejected') return 'bg-red-50 border-red-200';
                  return 'bg-yellow-50 border-yellow-200';
                };

                return (
                  <div key={feedback.id} className={`p-3 border rounded-lg ${getResultColor()}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{feedback.candidate_name}</p>
                        <p className="text-xs text-slate-600">{feedback.job_title} - Round {feedback.round_number}</p>
                      </div>
                      {getResultIcon()}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i < (feedback.rating || 0) ? 'bg-yellow-500' : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-slate-600">{feedback.rating}/5</span>
                    </div>
                    {feedback.feedback && (
                      <p className="text-xs text-slate-700 mb-2 line-clamp-2">{feedback.feedback}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>By {feedback.interviewer_name}</span>
                      <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No interview feedback yet</p>
                <p className="text-xs text-slate-500 mt-1">Feedback will appear here when interviewers submit their reviews</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Pipeline Overview</h3>
          <div className="space-y-3">
            {[
              { stage: 'Applied', count: 45, color: 'bg-blue-500' },
              { stage: 'Screening', count: 28, color: 'bg-yellow-500' },
              { stage: 'Interview', count: 15, color: 'bg-orange-500' },
              { stage: 'Offer', count: 8, color: 'bg-green-500' },
              { stage: 'Hired', count: 12, color: 'bg-emerald-500' },
            ].map((item) => (
              <div key={item.stage}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{item.stage}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: `${(item.count / 45) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
