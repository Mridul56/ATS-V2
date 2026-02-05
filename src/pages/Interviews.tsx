import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Clock, MapPin, Video, Plus, Users, FileText, X, MessageSquare } from 'lucide-react';
import type { Database } from '../lib/database.types';

type InterviewSchedule = {
  id: string;
  job_application_id: string;
  candidate_id: string;
  job_id: string;
  round_number: number;
  interviewer_id: string | null;
  scheduled_at: string | null;
  duration_minutes: number;
  status: string;
  feedback: string | null;
  rating: number | null;
  result: string | null;
  meeting_link: string | null;
  notes: string | null;
  candidate: {
    full_name: string;
    email: string;
    phone: string | null;
    current_company: string | null;
    current_title: string | null;
    years_of_experience: number | null;
    linkedin_url: string | null;
    resume_url: string | null;
  };
  job: {
    title: string;
    department: string;
    location: string;
  };
  recruiter: {
    email: string;
    full_name: string;
  } | null;
};

export const Interviews: React.FC = () => {
  const { profile } = useAuth();
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'scheduled' | 'completed' | 'all'>('scheduled');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<InterviewSchedule | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [feedbackForm, setFeedbackForm] = useState({
    skill_rating: '',
    feedback_text: '',
    recommendation: '' as 'yes' | 'no' | 'maybe' | '',
  });

  useEffect(() => {
    loadInterviews();
  }, [profile]);

  const loadInterviews = async () => {
    if (!profile) return;

    try {
      let query = supabase
        .from('interview_schedules')
        .select(`
          *,
          candidate:candidates(
            full_name,
            email,
            phone,
            current_company,
            current_title,
            years_of_experience,
            linkedin_url,
            resume_url
          ),
          job:jobs(
            title,
            department,
            location,
            recruiter_id,
            recruiter:recruiter_id(email, full_name)
          )
        `)
        .order('scheduled_at', { ascending: true });

      if (profile.role === 'interviewer') {
        query = query.eq('interviewer_id', profile.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        candidate: item.candidate,
        job: item.job,
        recruiter: item.job?.recruiter || null,
      }));

      setInterviews(formattedData);
    } catch (error) {
      console.error('Error loading interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInterview || !feedbackForm.skill_rating || !feedbackForm.recommendation) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    try {
      await supabase
        .from('interview_schedules')
        .update({
          status: 'completed',
          feedback: feedbackForm.feedback_text,
          rating: parseInt(feedbackForm.skill_rating),
          result: feedbackForm.recommendation === 'yes' ? 'passed' : feedbackForm.recommendation === 'no' ? 'rejected' : 'on_hold',
        })
        .eq('id', selectedInterview.id);

      if (selectedInterview.recruiter?.email) {
        try {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-recruiter-feedback`;
          await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              recruiter_email: selectedInterview.recruiter.email,
              candidate_name: selectedInterview.candidate.full_name,
              job_title: selectedInterview.job.title,
              interviewer_name: profile?.full_name,
              skill_rating: feedbackForm.skill_rating,
              feedback_text: feedbackForm.feedback_text,
              recommendation: feedbackForm.recommendation,
              interview_round: selectedInterview.round_number,
            }),
          });
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
        }
      }

      setShowFeedbackModal(false);
      setSelectedInterview(null);
      setFeedbackForm({ skill_rating: '', feedback_text: '', recommendation: '' });
      loadInterviews();
      alert('Feedback submitted successfully! Recruiter has been notified.');
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      alert(error.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredInterviews = () => {
    return interviews.filter((interview) => {
      if (filter === 'scheduled') return interview.status === 'scheduled';
      if (filter === 'completed') return interview.status === 'completed';
      return true;
    });
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const canScheduleInterviews =
    profile?.role === 'admin' ||
    profile?.role === 'recruiter' ||
    profile?.role === 'hiring_manager';

  const filteredInterviews = getFilteredInterviews();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Interviews</h2>
          <p className="text-slate-600">Manage interview schedules and feedback</p>
        </div>
        {canScheduleInterviews && (
          <button className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
            <Plus className="w-5 h-5" />
            <span>Schedule Interview</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex space-x-2">
          {[
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'completed', label: 'Completed' },
            { id: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredInterviews.map((interview) => {
          const schedTime = interview.scheduled_at ? formatDateTime(interview.scheduled_at) : null;
          return (
            <div
              key={interview.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {interview.candidate.full_name}
                    </h3>
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                      Round {interview.round_number}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-blue-600 mb-1">
                    {interview.job.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    {interview.job.department} • {interview.job.location}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    interview.status
                  )}`}
                >
                  {interview.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="text-sm text-slate-900">{interview.candidate.email}</p>
                </div>
                {interview.candidate.phone && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Phone</p>
                    <p className="text-sm text-slate-900">{interview.candidate.phone}</p>
                  </div>
                )}
                {interview.candidate.current_company && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current Company</p>
                    <p className="text-sm text-slate-900">{interview.candidate.current_company}</p>
                  </div>
                )}
                {interview.candidate.current_title && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Current Title</p>
                    <p className="text-sm text-slate-900">{interview.candidate.current_title}</p>
                  </div>
                )}
                {interview.candidate.years_of_experience !== null && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Experience</p>
                    <p className="text-sm text-slate-900">{interview.candidate.years_of_experience} years</p>
                  </div>
                )}
                {interview.candidate.linkedin_url && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">LinkedIn</p>
                    <a
                      href={interview.candidate.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      View Profile
                    </a>
                  </div>
                )}
              </div>

              {schedTime && (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>{schedTime.date}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>
                      {schedTime.time} ({interview.duration_minutes} min)
                    </span>
                  </div>
                  {interview.meeting_link && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600">
                      <Video className="w-4 h-4" />
                      <a
                        href={interview.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        Join Meeting
                      </a>
                    </div>
                  )}
                </div>
              )}

              {interview.feedback && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-900 mb-2">Feedback Submitted</p>
                  <p className="text-sm text-green-800">{interview.feedback}</p>
                  {interview.rating && (
                    <p className="text-sm text-green-800 mt-2">Rating: {interview.rating}/5</p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
                {interview.candidate.resume_url && (
                  <button
                    onClick={() => window.open(interview.candidate.resume_url, '_blank')}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    <FileText className="w-4 h-4" />
                    View Resume
                  </button>
                )}
                {interview.status === 'scheduled' && profile?.role === 'interviewer' && (
                  <button
                    onClick={() => {
                      setSelectedInterview(interview);
                      setShowFeedbackModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Submit Feedback
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredInterviews.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No interviews found</h3>
          <p className="text-slate-600 mb-6">
            {filter === 'scheduled'
              ? 'No scheduled interviews'
              : filter === 'completed'
              ? 'No completed interviews'
              : 'No interviews available'}
          </p>
          {canScheduleInterviews && filter === 'all' && (
            <button className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
              <Plus className="w-5 h-5" />
              <span>Schedule Interview</span>
            </button>
          )}
        </div>
      )}

      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Submit Interview Feedback</h3>
              <button
                onClick={() => {
                  setShowFeedbackModal(false);
                  setSelectedInterview(null);
                  setFeedbackForm({ skill_rating: '', feedback_text: '', recommendation: '' });
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600 mb-1">Candidate</p>
              <p className="text-lg font-semibold text-slate-900">{selectedInterview.candidate.full_name}</p>
              <p className="text-sm text-slate-600 mt-2">Job: {selectedInterview.job.title}</p>
              <p className="text-sm text-slate-600">Round: {selectedInterview.round_number}</p>
            </div>

            <form onSubmit={handleSubmitFeedback} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  How are the Candidate Skills? *
                </label>
                <select
                  value={feedbackForm.skill_rating}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, skill_rating: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  required
                >
                  <option value="">Select rating</option>
                  <option value="5">5 - Excellent</option>
                  <option value="4">4 - Very Good</option>
                  <option value="3">3 - Good</option>
                  <option value="2">2 - Fair</option>
                  <option value="1">1 - Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Any Feedback
                </label>
                <textarea
                  value={feedbackForm.feedback_text}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback_text: e.target.value })}
                  rows={5}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Share your detailed feedback about the candidate..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Good to go ahead? *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="recommendation"
                      value="yes"
                      checked={feedbackForm.recommendation === 'yes'}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, recommendation: 'yes' })}
                      className="w-4 h-4"
                      required
                    />
                    <div>
                      <p className="font-medium text-slate-900">Yes - Good to go ahead</p>
                      <p className="text-sm text-slate-600">Recommend proceeding to next round</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="recommendation"
                      value="maybe"
                      checked={feedbackForm.recommendation === 'maybe'}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, recommendation: 'maybe' })}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-slate-900">Maybe - Need more evaluation</p>
                      <p className="text-sm text-slate-600">On hold for further assessment</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input
                      type="radio"
                      name="recommendation"
                      value="no"
                      checked={feedbackForm.recommendation === 'no'}
                      onChange={(e) => setFeedbackForm({ ...feedbackForm, recommendation: 'no' })}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-medium text-slate-900">No - Not recommended</p>
                      <p className="text-sm text-slate-600">Do not proceed further</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setSelectedInterview(null);
                    setFeedbackForm({ skill_rating: '', feedback_text: '', recommendation: '' });
                  }}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
