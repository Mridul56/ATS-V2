import React, { useEffect, useState } from 'react';
import { ArrowLeft, User, Mail, Phone, Briefcase, Calendar, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];
type JobApplication = Database['public']['Tables']['job_applications']['Row'];

interface CandidateWithApplication extends Candidate {
  application: JobApplication;
  interview_rounds?: any[];
}

interface HiringManagerCandidatesProps {
  jobId: string;
  onBack: () => void;
}

export const HiringManagerCandidates: React.FC<HiringManagerCandidatesProps> = ({ jobId, onBack }) => {
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobAndCandidates();
  }, [jobId]);

  const loadJobAndCandidates = async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (jobError) throw jobError;
      setJob(jobData);

      const { data: applications, error: applicationsError } = await supabase
        .from('job_applications')
        .select(`
          *,
          candidate:candidates(*)
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      const candidatesWithData = await Promise.all(
        (applications || []).map(async (app: any) => {
          const { data: rounds } = await supabase
            .from('interview_rounds')
            .select('*, panelists:interview_round_panelists(*)')
            .eq('application_id', app.id)
            .order('round_number', { ascending: true });

          return {
            ...app.candidate,
            application: {
              id: app.id,
              job_id: app.job_id,
              candidate_id: app.candidate_id,
              stage: app.stage,
              stage_order: app.stage_order,
              cover_letter: app.cover_letter,
              applied_at: app.applied_at,
              updated_at: app.updated_at,
            },
            interview_rounds: rounds || [],
          };
        })
      );

      setCandidates(candidatesWithData);
    } catch (error) {
      console.error('Error loading data:', error);
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
        return 'bg-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Job not found</p>
        <button onClick={onBack} className="mt-4 text-slate-900 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Candidates for {job.title}</h2>
          <p className="text-slate-600 mt-1">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} applied</p>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <User className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No candidates yet</h3>
          <p className="text-slate-600">
            Candidates will appear here once the recruiter adds them to this requisition.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{candidate.full_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStageColor(candidate.application.stage)}`}>
                      {candidate.application.stage}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-3 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {candidate.email}
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {candidate.phone}
                      </div>
                    )}
                    {candidate.current_company && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {candidate.current_title} at {candidate.current_company}
                      </div>
                    )}
                    {candidate.years_of_experience && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {candidate.years_of_experience} years experience
                      </div>
                    )}
                  </div>

                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {candidate.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {candidate.interview_rounds && candidate.interview_rounds.length > 0 && (
                    <div className="border-t border-slate-200 pt-4 mt-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">Interview Rounds</p>
                      <div className="space-y-2">
                        {candidate.interview_rounds.map((round: any) => (
                          <div key={round.id} className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">
                              {round.round_name}
                              {round.scheduled_at && (
                                <span className="ml-2 text-slate-500">
                                  - {new Date(round.scheduled_at).toLocaleString()}
                                </span>
                              )}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              round.status === 'completed' ? 'bg-green-100 text-green-700' :
                              round.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {round.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {candidate.resume_url && (
                    <a
                      href={candidate.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Resume"
                    >
                      <FileText className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
