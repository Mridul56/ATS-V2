import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Star, X } from 'lucide-react';

interface InterviewFeedbackFormProps {
  interviewId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const InterviewFeedbackForm: React.FC<InterviewFeedbackFormProps> = ({
  interviewId,
  onClose,
  onSuccess,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);

  const [ratings, setRatings] = useState({
    overall_rating: 0,
    technical_skills: 0,
    communication: 0,
    culture_fit: 0,
  });

  const [recommendation, setRecommendation] = useState<
    'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no'
  >('maybe');
  const [comments, setComments] = useState('');

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .eq('is_active', true)
        .order('question_type');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    }
  };

  const handleRating = (category: keyof typeof ratings, value: number) => {
    setRatings({ ...ratings, [category]: value });
  };

  const renderStars = (category: keyof typeof ratings) => {
    return (
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => handleRating(category, value)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`w-6 h-6 ${
                value <= ratings[category]
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-slate-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!comments.trim()) {
      setError('Comments are required');
      return;
    }

    if (Object.values(ratings).some((r) => r === 0)) {
      setError('Please provide ratings for all categories');
      return;
    }

    setLoading(true);

    try {
      const { error: feedbackError } = await supabase.from('interview_feedback').insert({
        interview_id: interviewId,
        panelist_id: profile?.id,
        overall_rating: ratings.overall_rating,
        technical_skills: ratings.technical_skills,
        communication: ratings.communication,
        culture_fit: ratings.culture_fit,
        recommendation,
        comments,
      });

      if (feedbackError) throw feedbackError;

      if (selectedQuestions.length > 0) {
        const questionsData = selectedQuestions.map((questionId) => ({
          interview_id: interviewId,
          question_id: questionId,
          was_asked: true,
        }));

        await supabase.from('interview_questions_asked').insert(questionsData);
      }

      await supabase.from('activity_logs').insert({
        entity_type: 'interview',
        entity_id: interviewId,
        action: 'feedback_submitted',
        description: 'Interview feedback submitted',
        performed_by: profile?.id,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const recommendationOptions = [
    { value: 'strong_yes', label: 'Strong Hire', color: 'bg-green-600' },
    { value: 'yes', label: 'Hire', color: 'bg-green-500' },
    { value: 'maybe', label: 'Hold', color: 'bg-yellow-500' },
    { value: 'no', label: 'No Hire', color: 'bg-red-500' },
    { value: 'strong_no', label: 'Strong No Hire', color: 'bg-red-600' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Interview Feedback</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Candidate Evaluation</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Overall Rating *
                </label>
                {renderStars('overall_rating')}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Technical Skills *
                </label>
                {renderStars('technical_skills')}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Communication *
                </label>
                {renderStars('communication')}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Culture Fit *
                </label>
                {renderStars('culture_fit')}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Hiring Recommendation *</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {recommendationOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRecommendation(option.value as any)}
                  className={`px-4 py-3 rounded-lg font-medium text-white transition ${
                    recommendation === option.value ? option.color : 'bg-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comments *
            </label>
            <textarea
              required
              rows={6}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Provide detailed feedback on the candidate's performance, strengths, and areas of concern..."
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Questions Asked (Optional)
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Select questions from the question bank that were asked during this interview
            </p>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-4 space-y-2">
              {questions.map((question) => (
                <label key={question.id} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.includes(question.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedQuestions([...selectedQuestions, question.id]);
                      } else {
                        setSelectedQuestions(
                          selectedQuestions.filter((id) => id !== question.id)
                        );
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">{question.question_text}</p>
                    <p className="text-xs text-slate-500">
                      {question.question_type} • {question.difficulty || 'N/A'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
