import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Calendar, User, CheckCircle, XCircle, Clock, X } from 'lucide-react';

interface InterviewSchedule {
  id: string;
  round_number: number;
  interviewer_id: string | null;
  interviewer_name: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  status: string;
  feedback: string | null;
  rating: number | null;
  result: string | null;
  meeting_link: string | null;
  notes: string | null;
}

interface InterviewRoundManagerProps {
  candidateId: string;
  jobId: string;
  applicationId: string;
  onUpdate?: () => void;
}

interface Profile {
  id: string;
  full_name: string;
  role: string;
}

interface Interviewer {
  name: string;
  email: string;
  role: string;
}

export const InterviewRoundManager: React.FC<InterviewRoundManagerProps> = ({
  candidateId,
  jobId,
  applicationId,
  onUpdate,
}) => {
  const { profile } = useAuth();
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newInterview, setNewInterview] = useState({
    round_number: 1,
    interviewer_name: '',
    interviewer_email: '',
    scheduled_at: '',
    duration_minutes: 60,
    meeting_link: '',
    notes: '',
  });

  useEffect(() => {
    loadInterviews();
    loadInterviewers();
  }, [candidateId, applicationId, jobId]);

  const loadInterviews = async () => {
    try {
      const { data, error } = await supabase
        .from('interview_rounds')
        .select('*, panelists:interview_round_panelists(*)')
        .eq('application_id', applicationId)
        .order('round_number', { ascending: true });

      if (error) throw error;

      const interviewsData = (data || []).map((int: any) => ({
        id: int.id,
        round_number: int.round_number,
        interviewer_id: null,
        interviewer_name: int.panelists?.map((p: any) => p.panelist_name).join(', ') || null,
        scheduled_at: int.scheduled_at,
        duration_minutes: 60,
        status: int.status,
        feedback: int.feedback,
        rating: int.rating,
        result: int.result,
        meeting_link: int.meeting_link,
        notes: int.notes,
      }));

      setInterviews(interviewsData);

      const maxRound = interviewsData.length > 0
        ? Math.max(...interviewsData.map(i => i.round_number))
        : 0;
      setNewInterview(prev => ({ ...prev, round_number: maxRound + 1 }));
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInterviewers = async () => {
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('interviewers')
        .eq('id', jobId)
        .maybeSingle();

      if (error) throw error;

      const interviewersList = (job?.interviewers as Interviewer[]) || [];
      setInterviewers(interviewersList);
    } catch (error) {
      console.error('Error loading interviewers:', error);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newInterview.interviewer_name || !newInterview.interviewer_email || !newInterview.scheduled_at) {
      alert('Please select an interviewer and schedule date/time');
      return;
    }

    setSubmitting(true);

    try {
      const { data: newRound, error: roundError } = await supabase
        .from('interview_rounds')
        .insert({
          application_id: applicationId,
          round_number: newInterview.round_number,
          round_name: `Round ${newInterview.round_number}`,
          scheduled_at: newInterview.scheduled_at,
          meeting_link: newInterview.meeting_link || null,
          notes: newInterview.notes || null,
          status: 'scheduled',
          created_by: profile?.id,
        })
        .select()
        .single();

      if (roundError) throw roundError;

      const { error: panelistError } = await supabase
        .from('interview_round_panelists')
        .insert({
          interview_round_id: newRound.id,
          panelist_name: newInterview.interviewer_name,
          panelist_email: newInterview.interviewer_email,
          panelist_role: interviewers.find(i => i.name === newInterview.interviewer_name)?.role || null,
        });

      if (panelistError) throw panelistError;

      const { error: appError } = await supabase
        .from('job_applications')
        .update({ stage: 'interview' })
        .eq('id', applicationId);

      if (appError) throw appError;

      await supabase.from('activity_logs').insert({
        entity_type: 'candidate',
        entity_id: candidateId,
        action: 'interview_scheduled',
        description: `Interview Round ${newInterview.round_number} scheduled`,
        performed_by: profile?.id,
      });

      setNewInterview({
        round_number: newInterview.round_number + 1,
        interviewer_name: '',
        interviewer_email: '',
        scheduled_at: '',
        duration_minutes: 60,
        meeting_link: '',
        notes: '',
      });

      setShowAddModal(false);
      loadInterviews();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      alert(error.message || 'Failed to schedule interview');
    } finally {
      setSubmitting(false);
    }
  };

  const updateInterviewResult = async (
    interviewId: string,
    result: string,
    feedback?: string,
    rating?: number
  ) => {
    try {
      const { error } = await supabase
        .from('interview_rounds')
        .update({
          result,
          feedback: feedback || null,
          rating: rating || null,
          status: 'completed',
        })
        .eq('id', interviewId);

      if (error) throw error;

      if (result === 'rejected') {
        await supabase
          .from('job_applications')
          .update({ stage: 'rejected' })
          .eq('id', applicationId);
      }

      loadInterviews();
      onUpdate?.();
    } catch (error) {
      console.error('Error updating interview result:', error);
    }
  };

  const canScheduleNextRound = () => {
    if (interviews.length === 0) return true;

    const lastRound = interviews[interviews.length - 1];
    return lastRound.status === 'completed' && lastRound.result === 'passed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      case 'no_show':
        return 'bg-yellow-100 text-yellow-700';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Interview Rounds</h3>
        {canScheduleNextRound() ? (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 text-sm bg-slate-900 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" />
            Schedule Round {newInterview.round_number}
          </button>
        ) : (
          <div className="text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
            Complete previous round to schedule next
          </div>
        )}
      </div>

      {interviews.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-lg">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600">No interviews scheduled yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {interviews.map((interview) => (
            <div
              key={interview.id}
              className="bg-white border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-slate-700">R{interview.round_number}</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Round {interview.round_number}</h4>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User className="w-3 h-3" />
                      <span>{interview.interviewer_name || 'Not assigned'}</span>
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

              {interview.scheduled_at && (
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(interview.scheduled_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>{interview.duration_minutes} minutes</span>
                </div>
              )}

              {interview.meeting_link && (
                <a
                  href={interview.meeting_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Join Meeting
                </a>
              )}

              {interview.status === 'scheduled' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => updateInterviewResult(interview.id, 'passed')}
                    className="flex-1 text-sm bg-green-50 text-green-700 px-3 py-2 rounded hover:bg-green-100 transition"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => updateInterviewResult(interview.id, 'on_hold')}
                    className="flex-1 text-sm bg-yellow-50 text-yellow-700 px-3 py-2 rounded hover:bg-yellow-100 transition"
                  >
                    On Hold
                  </button>
                  <button
                    onClick={() => updateInterviewResult(interview.id, 'rejected')}
                    className="flex-1 text-sm bg-red-50 text-red-700 px-3 py-2 rounded hover:bg-red-100 transition"
                  >
                    Reject
                  </button>
                </div>
              )}

              {interview.feedback && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-sm text-slate-600">{interview.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-900">
                Schedule Interview - Round {newInterview.round_number}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Interviewer *
                </label>
                {interviewers.length > 0 ? (
                  <select
                    value={`${newInterview.interviewer_name}|${newInterview.interviewer_email}`}
                    onChange={(e) => {
                      const [name, email] = e.target.value.split('|');
                      setNewInterview({ ...newInterview, interviewer_name: name, interviewer_email: email });
                    }}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    required
                  >
                    <option value="">Select an interviewer</option>
                    {interviewers.map((interviewer, index) => (
                      <option key={index} value={`${interviewer.name}|${interviewer.email}`}>
                        {interviewer.name} {interviewer.role && `(${interviewer.role})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-sm text-slate-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    No interviewers added to this job. Please add interviewers in the job details.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={newInterview.scheduled_at}
                  onChange={(e) =>
                    setNewInterview({ ...newInterview, scheduled_at: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={newInterview.duration_minutes}
                  onChange={(e) =>
                    setNewInterview({ ...newInterview, duration_minutes: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={newInterview.meeting_link}
                  onChange={(e) =>
                    setNewInterview({ ...newInterview, meeting_link: e.target.value })
                  }
                  placeholder="https://meet.google.com/..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={newInterview.notes}
                  onChange={(e) => setNewInterview({ ...newInterview, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional notes for the interviewer..."
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Schedule Interview'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
