import React, { useEffect, useState } from 'react';
import { Briefcase, Clock, CheckCircle, XCircle, Calendar, MapPin, Building2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type JobApplication = Database['public']['Tables']['job_applications']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type Interview = Database['public']['Tables']['interviews']['Row'];

interface ApplicationWithDetails extends JobApplication {
  job: Job;
  interviews: Interview[];
}

export const CandidateDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidateId, setCandidateId] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (candidateError) throw candidateError;
      if (!candidateData) {
        setLoading(false);
        return;
      }

      setCandidateId(candidateData.id);

      const { data: applicationsData, error: applicationsError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs(*),
          interviews(*)
        `)
        .eq('candidate_id', candidateData.id)
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      setApplications(applicationsData as any || []);
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'applied':
        return 'bg-blue-100 text-blue-700';
      case 'screening':
        return 'bg-yellow-100 text-yellow-700';
      case 'interview':
        return 'bg-purple-100 text-purple-700';
      case 'offer':
        return 'bg-green-100 text-green-700';
      case 'hired':
        return 'bg-green-600 text-white';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'applied':
        return <Clock className="w-5 h-5" />;
      case 'screening':
        return <Briefcase className="w-5 h-5" />;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">My Applications</h1>
              <p className="text-slate-600 mt-1">Welcome back, {profile?.full_name}!</p>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {applications.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
            <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No applications yet</h3>
            <p className="text-slate-600 mb-6">
              You haven't applied to any positions yet.
            </p>
            <a
              href="/careers"
              className="inline-block px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Browse Open Positions
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                      {application.job.title}
                    </h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {application.job.department}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {application.job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Applied {new Date(application.applied_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium ${getStageColor(application.stage)}`}>
                    {getStageIcon(application.stage)}
                    <span className="capitalize">{application.stage.replace('_', ' ')}</span>
                  </div>
                </div>

                {application.interviews && application.interviews.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Scheduled Interviews
                    </h4>
                    <div className="space-y-2">
                      {application.interviews.map((interview) => (
                        <div
                          key={interview.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{interview.title}</p>
                            <p className="text-sm text-slate-600">
                              {new Date(interview.scheduled_at).toLocaleString()} • {interview.duration_minutes} minutes
                            </p>
                            {interview.meeting_link && (
                              <a
                                href={interview.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-slate-900 hover:underline mt-1 inline-block"
                              >
                                Join Meeting →
                              </a>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            interview.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                            interview.status === 'completed' ? 'bg-green-100 text-green-700' :
                            interview.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {interview.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {application.stage === 'applied' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Your application is being reviewed by our recruitment team. We'll reach out soon!
                    </p>
                  </div>
                )}

                {application.stage === 'screening' && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Your application has passed initial screening. We're evaluating your profile for the next round.
                    </p>
                  </div>
                )}

                {application.stage === 'offer' && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      Congratulations! We're preparing an offer for you. Our team will contact you shortly.
                    </p>
                  </div>
                )}

                {application.stage === 'hired' && (
                  <div className="mt-4 p-3 bg-green-600 text-white rounded-lg">
                    <p className="text-sm font-medium">
                      Welcome to the team! We're excited to have you onboard.
                    </p>
                  </div>
                )}

                {application.stage === 'rejected' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      Thank you for your interest. We've decided to move forward with other candidates. We encourage you to apply for other positions.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 p-6 bg-white rounded-xl border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Need Help?</h3>
          <p className="text-slate-600 mb-4">
            If you have any questions about your application status or the hiring process, please contact our recruitment team.
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:recruitment@company.com"
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Contact Recruitment
            </a>
            <a
              href="/careers"
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Browse More Jobs
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
