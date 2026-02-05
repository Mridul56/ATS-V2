import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Plus } from 'lucide-react';

interface JobFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const JobForm: React.FC<JobFormProps> = ({ onClose, onSuccess }) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    job_type: 'full_time' as const,
    description: '',
    requirements: '',
    salary_min: '',
    salary_max: '',
    number_of_openings: '1',
    target_hire_date: '',
    min_experience_years: '',
  });

  const [mandatoryKeywords, setMandatoryKeywords] = useState<string[]>([]);
  const [preferredKeywords, setPreferredKeywords] = useState<string[]>([]);
  const [requiredQualifications, setRequiredQualifications] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [preferredInput, setPreferredInput] = useState('');
  const [qualificationInput, setQualificationInput] = useState('');
  const [interviewers, setInterviewers] = useState<Array<{ name: string; email: string; role: string }>>([]);
  const [interviewerInput, setInterviewerInput] = useState({ name: '', email: '', role: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: insertError } = await supabase.from('jobs').insert({
        title: formData.title,
        department: formData.department,
        location: formData.location,
        job_type: formData.job_type,
        description: formData.description,
        requirements: formData.requirements,
        salary_min: formData.salary_min ? parseFloat(formData.salary_min) : null,
        salary_max: formData.salary_max ? parseFloat(formData.salary_max) : null,
        number_of_openings: parseInt(formData.number_of_openings),
        target_hire_date: formData.target_hire_date || null,
        min_experience_years: formData.min_experience_years ? parseInt(formData.min_experience_years) : null,
        mandatory_keywords: mandatoryKeywords,
        preferred_keywords: preferredKeywords,
        required_qualifications: requiredQualifications,
        interviewers: interviewers,
        status: 'draft',
        created_by: profile?.id,
      });

      if (insertError) throw insertError;

      await supabase.from('activity_logs').insert({
        entity_type: 'job',
        entity_id: profile?.id || '',
        action: 'create',
        description: `Created job requisition: ${formData.title}`,
        performed_by: profile?.id,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = (type: 'mandatory' | 'preferred' | 'qualification') => {
    if (type === 'mandatory' && keywordInput.trim()) {
      setMandatoryKeywords([...mandatoryKeywords, keywordInput.trim()]);
      setKeywordInput('');
    } else if (type === 'preferred' && preferredInput.trim()) {
      setPreferredKeywords([...preferredKeywords, preferredInput.trim()]);
      setPreferredInput('');
    } else if (type === 'qualification' && qualificationInput.trim()) {
      setRequiredQualifications([...requiredQualifications, qualificationInput.trim()]);
      setQualificationInput('');
    }
  };

  const removeItem = (type: 'mandatory' | 'preferred' | 'qualification', index: number) => {
    if (type === 'mandatory') {
      setMandatoryKeywords(mandatoryKeywords.filter((_, i) => i !== index));
    } else if (type === 'preferred') {
      setPreferredKeywords(preferredKeywords.filter((_, i) => i !== index));
    } else {
      setRequiredQualifications(requiredQualifications.filter((_, i) => i !== index));
    }
  };

  const addInterviewer = () => {
    if (interviewerInput.name.trim() && interviewerInput.email.trim()) {
      setInterviewers([...interviewers, { ...interviewerInput }]);
      setInterviewerInput({ name: '', email: '', role: '' });
    }
  };

  const removeInterviewer = (index: number) => {
    setInterviewers(interviewers.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Create Job Requisition</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Role Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="e.g., Senior Full Stack Engineer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="e.g., Engineering"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="e.g., San Francisco, CA / Remote"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employment Type *
                </label>
                <select
                  value={formData.job_type}
                  onChange={(e) => setFormData({ ...formData, job_type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Number of Openings *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.number_of_openings}
                  onChange={(e) => setFormData({ ...formData, number_of_openings: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Target Hire Date
                </label>
                <input
                  type="date"
                  value={formData.target_hire_date}
                  onChange={(e) => setFormData({ ...formData, target_hire_date: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Salary
                </label>
                <input
                  type="number"
                  value={formData.salary_min}
                  onChange={(e) => setFormData({ ...formData, salary_min: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="80000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Maximum Salary
                </label>
                <input
                  type="number"
                  value={formData.salary_max}
                  onChange={(e) => setFormData({ ...formData, salary_max: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="120000"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Job Description</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Responsibilities *
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Describe the role responsibilities..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Requirements
                </label>
                <textarea
                  rows={4}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="List the requirements..."
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Resume Screening Criteria
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              These fields help automatically screen and prioritize candidates
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Minimum Experience (Years)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.min_experience_years}
                  onChange={(e) => setFormData({ ...formData, min_experience_years: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="e.g., 5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mandatory Keywords (Must-Have Skills)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('mandatory'))}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="e.g., React, TypeScript"
                  />
                  <button
                    type="button"
                    onClick={() => addKeyword('mandatory')}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {mandatoryKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                    >
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => removeItem('mandatory', index)}
                        className="hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Preferred Keywords (Good-to-Have Skills)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={preferredInput}
                    onChange={(e) => setPreferredInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('preferred'))}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="e.g., GraphQL, AWS"
                  />
                  <button
                    type="button"
                    onClick={() => addKeyword('preferred')}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {preferredKeywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      <span>{keyword}</span>
                      <button
                        type="button"
                        onClick={() => removeItem('preferred', index)}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Required Qualifications
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={qualificationInput}
                    onChange={(e) => setQualificationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword('qualification'))}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="e.g., Bachelor's in Computer Science"
                  />
                  <button
                    type="button"
                    onClick={() => addKeyword('qualification')}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {requiredQualifications.map((qual, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      <span>{qual}</span>
                      <button
                        type="button"
                        onClick={() => removeItem('qualification', index)}
                        className="hover:text-green-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Interview Panel
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Add interviewers who will be available for scheduling interviews
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={interviewerInput.name}
                  onChange={(e) => setInterviewerInput({ ...interviewerInput, name: e.target.value })}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Interviewer Name"
                />
                <input
                  type="email"
                  value={interviewerInput.email}
                  onChange={(e) => setInterviewerInput({ ...interviewerInput, email: e.target.value })}
                  className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Email"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={interviewerInput.role}
                    onChange={(e) => setInterviewerInput({ ...interviewerInput, role: e.target.value })}
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Role/Title"
                  />
                  <button
                    type="button"
                    onClick={addInterviewer}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {interviewers.length > 0 && (
                <div className="space-y-2">
                  {interviewers.map((interviewer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{interviewer.name}</p>
                        <p className="text-sm text-slate-600">{interviewer.email}</p>
                        {interviewer.role && (
                          <p className="text-xs text-slate-500">{interviewer.role}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeInterviewer(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              {loading ? 'Creating...' : 'Create Job Requisition'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
