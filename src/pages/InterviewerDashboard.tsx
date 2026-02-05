import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, User, Briefcase, Mail, Phone, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { InterviewFeedbackForm } from '../components/InterviewFeedbackForm';

interface InterviewAssignment {
  id: string;
  round_number: number;
  round_name: string;
  scheduled_at: string | null;
  status: string;
  meeting_link: string | null;
  notes: string | null;
  feedback: string | null;
  rating: number | null;
  result: string | null;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    current_company: string | null;
    current_title: string | null;
    years_of_experience: number | null;
    resume_url: string | null;
  };
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
  };
  application: {
    id: string;
    stage: string;
  };
}

export const InterviewerDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [interviews, setInterviews] = useState<InterviewAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<InterviewAssignment | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  useEffect(() => {
    loadInterviews();
  }, [profile]);

  const loadInterviews = async () => {
    if (!profile?.email) return;

    try {
      const { data: panelists, error: panelistError } = await supabase
        .from('interview_round_panelists')
        .select('interview_round_id')
        .eq('panelist_email', profile.email);

      if (panelistError) throw panelistError;

      const roundIds = (panelists || []).map(p => p.interview_round_id);

      if (roundIds.length === 0) {
        setLoading(false);
        return;
      }

      const { data: rounds, error } = await supabase
        .from('interview_rounds')
        .select(`
          id,
          round_number,
          round_name,
          scheduled_at,
          status,
          meeting_link,
          notes,
          feedback,
          rating,
          result,
          application_id
        `)
        .in('id', roundIds)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      const interviewsWithDetails = await Promise.all(
        (rounds || []).map(async (round: any) => {
          const { data: application } = await supabase
            .from('job_applications')
            .select(`
              id,
              stage,
              candidate_id,
              job_id
            `)
            .eq('id', round.application_id)
            .maybeSingle();

          if (!application) return null;

          const { data: candidate } = await supabase
            .from('candidates')
            .select('*')
            .eq('id', application.candidate_id)
            .maybeSingle();

          const { data: job } = await supabase
            .from('jobs')
            .select('id, title, department, location')
            .eq('id', application.job_id)
            .maybeSingle();

          return {
            id: round.id,
            round_number: round.round_number,
            round_name: round.round_name,
            scheduled_at: round.scheduled_at,
            status: round.status,
            meeting_link: round.meeting_link,
            notes: round.notes,
            feedback: round.feedback,
            rating: round.rating,
            result: round.result,
            candidate: candidate || {},
            job: job || {},
            application: {
              id: application.id,
              stage: application.stage,
            },
          };
        })
      );

      setInterviews(interviewsWithDetails.filter(Boolean) as InterviewAssignment[]);
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getResultIcon = (result: string | null) => {
    switch (result) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'on_hold':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return null;
    }
  };

  const upcomingInterviews = interviews.filter(
    (i) => i.status === 'scheduled' && i.scheduled_at && new Date(i.scheduled_at) > new Date()
  );

  const pastInterviews = interviews.filter(
    (i) => i.status === 'completed' || (i.scheduled_at && new Date(i.scheduled_at) <= new Date())
  );

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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">My Interviews</h2>
        <p className="text-slate-600">Manage your scheduled interviews and provide feedback</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-slate-900">{upcomingInterviews.length}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-slate-900">
                {interviews.filter((i) => i.status === 'completed').length}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 mb-1">Pending Feedback</p>
              <p className="text-3xl font-bold text-slate-900">
                {interviews.filter((i) => i.status === 'scheduled' && !i.feedback).length}
              </p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {upcomingInterviews.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Interviews</h3>
            <div className="space-y-4">
              {upcomingInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-slate-700">R{interview.round_number}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{interview.candidate.full_name}</h4>
                          <p className="text-sm text-slate-600">{interview.job.title}</p>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(interview.status)}`}>
                      {interview.status}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {interview.scheduled_at
                          ? new Date(interview.scheduled_at).toLocaleString('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : 'Not scheduled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Briefcase className="w-4 h-4" />
                      <span>{interview.job.department} • {interview.job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail className="w-4 h-4" />
                      <span>{interview.candidate.email}</span>
                    </div>
                    {interview.candidate.phone && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="w-4 h-4" />
                        <span>{interview.candidate.phone}</span>
                      </div>
                    )}
                  </div>

                  {interview.candidate.current_company && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">Current:</span> {interview.candidate.current_title} at{' '}
                        {interview.candidate.current_company}
                        {interview.candidate.years_of_experience && (
                          <span> • {interview.candidate.years_of_experience} years experience</span>
                        )}
                      </p>
                    </div>
                  )}

                  {interview.notes && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-slate-700">{interview.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-slate-200">
                    {interview.candidate.resume_url && (
                      <a
                        href={interview.candidate.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        View Resume
                      </a>
                    )}
                    {interview.meeting_link && (
                      <a
                        href={interview.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                      >
                        <Calendar className="w-4 h-4" />
                        Join Meeting
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSelectedInterview(interview);
                        setShowFeedbackModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastInterviews.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Past Interviews</h3>
            <div className="space-y-4">
              {pastInterviews.map((interview) => (
                <div
                  key={interview.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-slate-700">R{interview.round_number}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{interview.candidate.full_name}</h4>
                          <p className="text-sm text-slate-600">{interview.job.title}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {interview.result && getResultIcon(interview.result)}
                      <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(interview.status)}`}>
                        {interview.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {interview.scheduled_at
                        ? new Date(interview.scheduled_at).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Not scheduled'}
                    </span>
                  </div>

                  {interview.feedback && (
                    <div className="p-3 bg-slate-50 rounded-lg mb-3">
                      <p className="text-sm font-medium text-slate-700 mb-1">Your Feedback:</p>
                      <p className="text-sm text-slate-600">{interview.feedback}</p>
                      {interview.rating && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-600">Rating:</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${
                                  i < interview.rating! ? 'bg-yellow-500' : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-slate-600">{interview.rating}/5</span>
                        </div>
                      )}
                    </div>
                  )}

                  {interview.status === 'scheduled' && !interview.feedback && (
                    <button
                      onClick={() => {
                        setSelectedInterview(interview);
                        setShowFeedbackModal(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm font-medium"
                    >
                      Submit Feedback
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {interviews.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Interviews Scheduled</h3>
            <p className="text-slate-600">You don't have any interviews assigned yet.</p>
          </div>
        )}
      </div>

      {showFeedbackModal && selectedInterview && (
        <InterviewFeedbackForm
          interviewId={selectedInterview.id}
          onClose={() => {
            setShowFeedbackModal(false);
            setSelectedInterview(null);
          }}
          onSuccess={() => {
            setShowFeedbackModal(false);
            setSelectedInterview(null);
            loadInterviews();
          }}
        />
      )}
    </div>
  );
};
