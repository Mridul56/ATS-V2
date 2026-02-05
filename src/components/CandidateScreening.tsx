import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, TrendingUp, Award } from 'lucide-react';

interface CandidateScreeningProps {
  candidateId: string;
  jobId: string;
  applicationId: string;
}

export const CandidateScreening: React.FC<CandidateScreeningProps> = ({
  candidateId,
  jobId,
  applicationId,
}) => {
  const [candidate, setCandidate] = useState<any>(null);
  const [job, setJob] = useState<any>(null);
  const [screeningScore, setScreeningScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [candidateId, jobId, applicationId]);

  const loadData = async () => {
    try {
      const [candidateRes, jobRes, scoreRes] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', candidateId).single(),
        supabase.from('jobs').select('*').eq('id', jobId).single(),
        supabase.from('screening_scores').select('*').eq('application_id', applicationId).maybeSingle(),
      ]);

      if (candidateRes.error) throw candidateRes.error;
      if (jobRes.error) throw jobRes.error;

      setCandidate(candidateRes.data);
      setJob(jobRes.data);
      setScreeningScore(scoreRes.data);

      if (!scoreRes.data) {
        await calculateScore();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateScore = async () => {
    try {
      await supabase.rpc('calculate_screening_score', {
        p_application_id: applicationId,
        p_job_id: jobId,
        p_candidate_id: candidateId,
      });

      const { data } = await supabase
        .from('screening_scores')
        .select('*')
        .eq('application_id', applicationId)
        .single();

      setScreeningScore(data);
    } catch (error) {
      console.error('Error calculating score:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!candidate || !job) {
    return <div className="text-slate-600">Unable to load screening data</div>;
  }

  const mandatoryMatch = screeningScore
    ? (screeningScore.mandatory_keywords_matched / screeningScore.mandatory_keywords_total) * 100
    : 0;

  const preferredMatch = screeningScore
    ? (screeningScore.preferred_keywords_matched / screeningScore.preferred_keywords_total) * 100
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900">Resume Screening Analysis</h3>
        {screeningScore && (
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="text-2xl font-bold text-slate-900">
              {screeningScore.overall_match_percentage}%
            </span>
            <span className="text-sm text-slate-600">Match</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {job.mandatory_keywords && job.mandatory_keywords.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-900">
                Mandatory Skills
                {screeningScore && (
                  <span className="ml-2 text-sm text-slate-600">
                    ({screeningScore.mandatory_keywords_matched} of{' '}
                    {screeningScore.mandatory_keywords_total})
                  </span>
                )}
              </h4>
              {screeningScore && (
                <div className="flex items-center space-x-2">
                  {screeningScore.mandatory_keywords_matched ===
                  screeningScore.mandatory_keywords_total ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 text-red-600" />
                  )}
                  <span className="text-sm font-medium text-slate-700">
                    {mandatoryMatch.toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {job.mandatory_keywords.map((keyword: string, index: number) => {
                const isMatched = candidate.skills?.some((skill: string) =>
                  skill.toLowerCase().includes(keyword.toLowerCase())
                );
                return (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm ${
                      isMatched
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {keyword}
                    {isMatched && <Check className="inline w-3 h-3 ml-1" />}
                    {!isMatched && <X className="inline w-3 h-3 ml-1" />}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {job.preferred_keywords && job.preferred_keywords.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-900">
                Preferred Skills
                {screeningScore && (
                  <span className="ml-2 text-sm text-slate-600">
                    ({screeningScore.preferred_keywords_matched} of{' '}
                    {screeningScore.preferred_keywords_total})
                  </span>
                )}
              </h4>
              {screeningScore && (
                <span className="text-sm font-medium text-slate-700">
                  {preferredMatch.toFixed(0)}%
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {job.preferred_keywords.map((keyword: string, index: number) => {
                const isMatched = candidate.skills?.some((skill: string) =>
                  skill.toLowerCase().includes(keyword.toLowerCase())
                );
                return (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-sm ${
                      isMatched
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {keyword}
                    {isMatched && <Check className="inline w-3 h-3 ml-1" />}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {job.min_experience_years && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-slate-900">Experience Requirement</h4>
              {screeningScore?.experience_match ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <X className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div>
                <span className="text-slate-600">Required:</span>
                <span className="ml-2 font-medium text-slate-900">
                  {job.min_experience_years}+ years
                </span>
              </div>
              <div>
                <span className="text-slate-600">Candidate:</span>
                <span
                  className={`ml-2 font-medium ${
                    (candidate.years_of_experience || 0) >= job.min_experience_years
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}
                >
                  {candidate.years_of_experience || 0} years
                </span>
              </div>
            </div>
          </div>
        )}

        {job.required_qualifications && job.required_qualifications.length > 0 && (
          <div>
            <h4 className="font-medium text-slate-900 mb-3">Required Qualifications</h4>
            <div className="space-y-2">
              {job.required_qualifications.map((qual: string, index: number) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full mt-2"></div>
                  <span className="text-sm text-slate-700">{qual}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium text-slate-900 mb-3">Candidate Skills</h4>
          <div className="flex flex-wrap gap-2">
            {candidate.skills && candidate.skills.length > 0 ? (
              candidate.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm"
                >
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">No skills listed</span>
            )}
          </div>
        </div>

        {screeningScore && (
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Overall Match Score</p>
                <p className="text-2xl font-bold text-slate-900">
                  {screeningScore.overall_match_percentage}%
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp
                  className={`w-6 h-6 ${
                    screeningScore.overall_match_percentage >= 70
                      ? 'text-green-600'
                      : screeningScore.overall_match_percentage >= 40
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                />
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    screeningScore.overall_match_percentage >= 70
                      ? 'bg-green-100 text-green-700'
                      : screeningScore.overall_match_percentage >= 40
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {screeningScore.overall_match_percentage >= 70
                    ? 'Strong Match'
                    : screeningScore.overall_match_percentage >= 40
                    ? 'Moderate Match'
                    : 'Weak Match'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
