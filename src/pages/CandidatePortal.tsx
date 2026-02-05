import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase, MapPin, Calendar, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type JobApplication = Database['public']['Tables']['job_applications']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];

interface ApplicationWithDetails extends JobApplication {
  job: Job;
  candidate: Candidate;
  interviews: Array<{
    id: string;
    round_number: number;
    scheduled_at: string | null;
    status: string;
    result: string | null;
    interviewer_name: string | null;
  }>;
}

export const CandidatePortal: React.FC = () => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadApplications();
    }
  }, [user]);

  const loadApplications = async () => {
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (candidateError) throw candidateError;
      if (!candidateData) {
        setLoading(false);
        return;
      }

      const { data: appsData, error: appsError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs(*),
          candidate:candidates(*)
        `)
        .eq('candidate_id', candidateData.id)
        .order('applied_at', { ascending: false });

      if (appsError) throw appsError;

      const applicationsWithInterviews = await Promise.all(
        (appsData || []).map(async (app: any) => {
          const { data: interviews } = await supabase
            .from('interview_schedules')
            .select(`
              id,
              round_number,
              scheduled_at,
              status,
              result,
              interviewer:profiles!interviewer_id(full_name)
            `)
            .eq('job_application_id', app.id)
            .order('round_number', { ascending: true });

          return {
            ...app,
            interviews: (interviews || []).map((int: any) => ({
              id: int.id,
              round_number: int.round_number,
              scheduled_at: int.scheduled_at,
              status: int.status,
              result: int.result,
              interviewer_name: int.interviewer?.full_name || null,
            })),
          };
        })
      );

      setApplications(applicationsWithInterviews);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      applied: 'Application Received',
      screening: 'Under Review',
      interview: 'Interview Stage',
      offer: 'Offer Extended',
      hired: 'Hired',
      rejected: 'Not Selected',
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'applied':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'screening':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'interview':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'offer':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'hired':
        return 'bg-green-200 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'applied':
        return <Clock className="w-5 h-5" />;
      case 'screening':
        return <Eye className="w-5 h-5" />;
      case 'interview':
        return <Calendar className="w-5 h-5" />;
      case 'offer':
      case 'hired':
        return <CheckCircle className="w-5 h-5" />;
      case 'rejected':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!profile || profile.role !== 'candidate') {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Please log in as a candidate to view your applications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">My Applications</h2>
        <p className="text-slate-600">Track the status of your job applications</p>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Applications Yet</h3>
          <p className="text-slate-600">You haven't applied to any positions yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {applications.map((application) => (
            <div
              key={application.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {application.job.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        <span>{application.job.department}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{application.job.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Applied {formatDate(application.applied_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${getStageColor(
                      application.stage
                    )}`}
                  >
                    {getStageIcon(application.stage)}
                    <span className="font-medium">{getStageLabel(application.stage)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm">
                    {application.viewed_at ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <Eye className="w-4 h-4" />
                        <span>Viewed by recruiter on {formatDate(application.viewed_at)}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock className="w-4 h-4" />
                        <span>Awaiting review</span>
                      </div>
                    )}
                  </div>

                  {application.interviews.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-semibold text-slate-900 mb-3">Interview Schedule</h4>
                      <div className="space-y-3">
                        {application.interviews.map((interview) => (
                          <div
                            key={interview.id}
                            className="flex items-start justify-between bg-white p-3 rounded-lg border border-slate-200"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-slate-900">
                                  Round {interview.round_number}
                                </span>
                                {interview.result && (
                                  <span
                                    className={`text-xs px-2 py-1 rounded ${
                                      interview.result === 'passed'
                                        ? 'bg-green-100 text-green-700'
                                        : interview.result === 'rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {interview.result}
                                  </span>
                                )}
                              </div>
                              {interview.scheduled_at && (
                                <p className="text-sm text-slate-600">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {formatDateTime(interview.scheduled_at)}
                                </p>
                              )}
                              {interview.interviewer_name && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Interviewer: {interview.interviewer_name}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-xs px-3 py-1 rounded-full ${
                                interview.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : interview.status === 'scheduled'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {interview.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.current_interview_round > 0 && (
                    <div className="text-sm text-slate-600">
                      Currently in Round {application.current_interview_round}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-3 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Last updated: {formatDate(application.updated_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
