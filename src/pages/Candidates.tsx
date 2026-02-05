import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Mail, Phone, Briefcase, Tag, Filter, X, Upload } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Candidate = Database['public']['Tables']['candidates']['Row'];
type Job = Database['public']['Tables']['jobs']['Row'];
type CandidateStage = Database['public']['Enums']['candidate_stage'];
type JobApplication = Database['public']['Tables']['job_applications']['Row'];

const stages: { id: CandidateStage; name: string; color: string }[] = [
  { id: 'applied', name: 'Applied', color: 'bg-blue-500' },
  { id: 'screening', name: 'Screening', color: 'bg-yellow-500' },
  { id: 'interview', name: 'Interview', color: 'bg-orange-500' },
  { id: 'offer', name: 'Offer', color: 'bg-green-500' },
  { id: 'hired', name: 'Hired', color: 'bg-emerald-500' },
  { id: 'rejected', name: 'Rejected', color: 'bg-red-500' },
];

interface CandidatesProps {
  onCandidateSelect?: (candidateId: string) => void;
}

interface CandidateWithJob extends Candidate {
  job_title?: string;
  job_id?: string;
  application_id?: string;
  application_stage?: CandidateStage;
  interview_rounds?: any[];
  number_of_interview_rounds?: number;
}

export const Candidates: React.FC<CandidatesProps> = ({ onCandidateSelect }) => {
  const { profile } = useAuth();
  const [candidates, setCandidates] = useState<CandidateWithJob[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const [draggedCandidate, setDraggedCandidate] = useState<CandidateWithJob | null>(null);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);

  const [candidateForm, setCandidateForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    current_company: '',
    current_title: '',
    years_of_experience: '',
    skills: '',
    linkedin_url: '',
    resume_file: null as File | null,
    job_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadJobs();
    loadCandidates();
  }, []);

  const loadJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const { data: applications, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          candidate:candidates(*),
          job:jobs(id, title, number_of_interview_rounds)
        `)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      const candidatesWithJobs = await Promise.all(
        (applications || []).map(async (app: any) => {
          const { data: rounds } = await supabase
            .from('interview_rounds')
            .select('*, panelists:interview_round_panelists(*)')
            .eq('application_id', app.id)
            .order('round_number', { ascending: true });

          return {
            ...app.candidate,
            job_title: app.job?.title,
            job_id: app.job?.id,
            application_id: app.id,
            application_stage: app.stage,
            number_of_interview_rounds: app.job?.number_of_interview_rounds || 3,
            interview_rounds: rounds || [],
          };
        })
      );

      setCandidates(candidatesWithJobs);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (candidate: Candidate) => {
    setDraggedCandidate(candidate);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stage: CandidateStage) => {
    if (!draggedCandidate || !draggedCandidate.job_id) return;

    try {
      const { error: appError } = await supabase
        .from('job_applications')
        .update({ stage })
        .eq('candidate_id', draggedCandidate.id)
        .eq('job_id', draggedCandidate.job_id);

      if (appError) throw appError;

      const { error: candError } = await supabase
        .from('candidates')
        .update({ current_stage: stage })
        .eq('id', draggedCandidate.id);

      if (candError) throw candError;

      setCandidates((prev) =>
        prev.map((c) =>
          c.id === draggedCandidate.id ? { ...c, current_stage: stage, application_stage: stage } : c
        )
      );

      await supabase.from('activity_logs').insert({
        entity_type: 'candidate',
        entity_id: draggedCandidate.id,
        action: 'stage_change',
        description: `Moved candidate to ${stage} for ${draggedCandidate.job_title}`,
        performed_by: profile?.id,
      });
    } catch (error) {
      console.error('Error updating candidate stage:', error);
    } finally {
      setDraggedCandidate(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setErrors({ ...errors, resume_file: 'Please upload a PDF or TXT file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, resume_file: 'File size must be less than 10MB' });
      return;
    }

    setCandidateForm({ ...candidateForm, resume_file: file });
    setErrors({ ...errors, resume_file: '' });
    setParsing(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Content = reader.result?.toString().split(',')[1];

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileContent: base64Content,
              fileName: file.name,
            }),
          }
        );

        const result = await response.json();

        if (result.success && result.parsedData) {
          const { parsedData } = result;
          setCandidateForm(prev => ({
            ...prev,
            full_name: parsedData.fullName || prev.full_name,
            email: parsedData.email || prev.email,
            phone: parsedData.phone || prev.phone,
            current_company: parsedData.currentCompany || prev.current_company,
            linkedin_url: parsedData.linkedinUrl || prev.linkedin_url,
            years_of_experience: parsedData.yearsOfExperience ? parsedData.yearsOfExperience.toString() : prev.years_of_experience,
          }));
        }

        setParsing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error parsing resume:', error);
      setParsing(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!candidateForm.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!candidateForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateForm.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!candidateForm.job_id) newErrors.job_id = 'Please select a job requisition';
    if (!candidateForm.resume_file) newErrors.resume_file = 'Resume/CV is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitCandidate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let resumeUrl = null;

      if (candidateForm.resume_file) {
        const fileExt = candidateForm.resume_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, candidateForm.resume_file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName);

        resumeUrl = publicUrl;
      }

      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .insert({
          full_name: candidateForm.full_name,
          email: candidateForm.email,
          phone: candidateForm.phone || null,
          current_company: candidateForm.current_company || null,
          current_title: candidateForm.current_title || null,
          years_of_experience: candidateForm.years_of_experience ? parseInt(candidateForm.years_of_experience) : null,
          skills: candidateForm.skills ? candidateForm.skills.split(',').map(s => s.trim()) : [],
          linkedin_url: candidateForm.linkedin_url || null,
          resume_url: resumeUrl,
          source: 'recruiter',
          current_stage: 'applied',
          created_by: profile?.id,
        })
        .select()
        .single();

      if (candidateError) throw candidateError;

      const { error: applicationError } = await supabase
        .from('job_applications')
        .insert({
          job_id: candidateForm.job_id,
          candidate_id: candidateData.id,
          stage: 'applied',
          stage_order: 1,
        });

      if (applicationError) throw applicationError;

      const selectedJob = jobs.find(j => j.id === candidateForm.job_id);
      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'candidate',
          entity_id: candidateData.id,
          action: 'candidate_added',
          description: `Added candidate ${candidateForm.full_name} to job ${selectedJob?.title}`,
          performed_by: profile?.id,
        });

      setCandidateForm({
        full_name: '',
        email: '',
        phone: '',
        current_company: '',
        current_title: '',
        years_of_experience: '',
        skills: '',
        linkedin_url: '',
        resume_file: null,
        job_id: '',
      });

      setShowAddCandidate(false);
      loadCandidates();
      alert('Candidate added successfully!');
    } catch (error: any) {
      console.error('Error adding candidate:', error);
      alert(error.message || 'Failed to add candidate');
    } finally {
      setSubmitting(false);
    }
  };


  const filteredCandidates = candidates.filter((candidate) => {
    const matchesSearch =
      candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.current_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.job_title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesJob = selectedJobId === 'all' || candidate.job_id === selectedJobId;

    return matchesSearch && matchesJob;
  });

  const getCandidatesByStage = (stage: CandidateStage) =>
    filteredCandidates.filter((c) => c.current_stage === stage);

  const canManageCandidates =
    profile?.role === 'admin' ||
    profile?.role === 'recruiter' ||
    profile?.role === 'hiring_manager';

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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Candidates</h2>
          <p className="text-slate-600">Manage your candidate pipeline</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'pipeline'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600'
              }`}
            >
              List
            </button>
          </div>
          {canManageCandidates && (
            <button
              onClick={() => setShowAddCandidate(true)}
              className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Add Candidate</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidates by name, email, company, or job..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {viewMode === 'pipeline' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageCandidates = getCandidatesByStage(stage.id);
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.id)}
              >
                <div className="bg-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${stage.color}`}></div>
                      <h3 className="font-semibold text-slate-900">{stage.name}</h3>
                    </div>
                    <span className="text-sm font-medium text-slate-600 bg-white px-2 py-1 rounded">
                      {stageCandidates.length}
                    </span>
                  </div>

                  <div className="space-y-3 max-h-[calc(100vh-24rem)] overflow-y-auto">
                    {stageCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={() => handleDragStart(candidate)}
                        onClick={() => onCandidateSelect?.(candidate.id)}
                        className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:shadow-md transition cursor-move"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-slate-900">{candidate.full_name}</h4>
                            {candidate.current_title && (
                              <p className="text-sm text-slate-600">{candidate.current_title}</p>
                            )}
                            {candidate.job_title && (
                              <p className="text-xs text-blue-600 font-medium mt-1">Applied for: {candidate.job_title}</p>
                            )}
                          </div>
                        </div>

                        {candidate.current_company && (
                          <div className="flex items-center space-x-1 text-sm text-slate-600 mb-2">
                            <Briefcase className="w-4 h-4" />
                            <span>{candidate.current_company}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1 text-sm text-slate-600 mb-1">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{candidate.email}</span>
                        </div>

                        {candidate.phone && (
                          <div className="flex items-center space-x-1 text-sm text-slate-600 mb-2">
                            <Phone className="w-4 h-4" />
                            <span>{candidate.phone}</span>
                          </div>
                        )}

                        {candidate.tags && candidate.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {candidate.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
                              >
                                <Tag className="w-3 h-3" />
                                <span>{tag}</span>
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500">
                              Applied {new Date(candidate.created_at).toLocaleDateString()}
                            </span>
                            {candidate.resume_url && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(candidate.resume_url, '_blank');
                                }}
                                className="text-xs text-slate-900 hover:text-slate-700 font-medium px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition"
                              >
                                View Resume
                              </button>
                            )}
                          </div>
                          {candidate.interview_rounds && candidate.interview_rounds.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {candidate.interview_rounds.map((round: any) => (
                                <div key={round.id} className="text-xs bg-slate-50 rounded px-2 py-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-slate-700">{round.round_name}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                      round.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      round.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {round.status}
                                    </span>
                                  </div>
                                  {round.panelists && round.panelists.length > 0 && (
                                    <div className="mt-1 text-slate-600">
                                      Interviewers: {round.panelists.map((p: any) => p.panelist_name).join(', ')}
                                    </div>
                                  )}
                                  {round.scheduled_at && (
                                    <div className="text-slate-500 mt-0.5">
                                      {new Date(round.scheduled_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {stageCandidates.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <p className="text-sm">No candidates</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Applied
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    onClick={() => onCandidateSelect?.(candidate.id)}
                    className="hover:bg-slate-50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {candidate.full_name}
                        </div>
                        {candidate.current_title && (
                          <div className="text-sm text-slate-500">{candidate.current_title}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {candidate.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {candidate.job_title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {candidate.current_company || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                        {candidate.current_stage}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 capitalize">
                      {candidate.source || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                      {new Date(candidate.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {candidate.resume_url && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(candidate.resume_url, '_blank');
                          }}
                          className="text-slate-900 hover:text-slate-700 font-medium"
                        >
                          View Resume
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCandidates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600">No candidates found</p>
            </div>
          )}
        </div>
      )}

      {showAddCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Add Candidate</h3>
              <button
                onClick={() => setShowAddCandidate(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCandidate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Job Requisition *
                </label>
                <select
                  value={candidateForm.job_id}
                  onChange={(e) => setCandidateForm({ ...candidateForm, job_id: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.job_id ? 'border-red-500' : 'border-slate-300'
                  }`}
                >
                  <option value="">Select a job requisition</option>
                  {jobs.filter(j => j.status === 'published' || j.status === 'approved').map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} - {job.department}
                    </option>
                  ))}
                </select>
                {errors.job_id && <p className="mt-1 text-sm text-red-600">{errors.job_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Resume/CV *
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 transition-colors">
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {candidateForm.resume_file ? candidateForm.resume_file.name : 'Click to upload resume (PDF or TXT)'}
                    </span>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {parsing && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                    Parsing resume and extracting data...
                  </div>
                )}
                {candidateForm.resume_file && !parsing && (
                  <div className="mt-2 text-sm text-green-600">
                    ✓ Resume uploaded and parsed successfully
                  </div>
                )}
                {errors.resume_file && <p className="mt-1 text-sm text-red-600">{errors.resume_file}</p>}
                <p className="mt-1 text-sm text-slate-500">Upload your resume and we'll automatically fill in the details (PDF or TXT, Max 10MB)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={candidateForm.full_name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, full_name: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.full_name ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={candidateForm.email}
                    onChange={(e) => setCandidateForm({ ...candidateForm, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={candidateForm.phone}
                    onChange={(e) => setCandidateForm({ ...candidateForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Company
                  </label>
                  <input
                    type="text"
                    value={candidateForm.current_company}
                    onChange={(e) => setCandidateForm({ ...candidateForm, current_company: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current Title
                  </label>
                  <input
                    type="text"
                    value={candidateForm.current_title}
                    onChange={(e) => setCandidateForm({ ...candidateForm, current_title: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={candidateForm.years_of_experience}
                    onChange={(e) => setCandidateForm({ ...candidateForm, years_of_experience: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    LinkedIn URL
                  </label>
                  <input
                    type="url"
                    value={candidateForm.linkedin_url}
                    onChange={(e) => setCandidateForm({ ...candidateForm, linkedin_url: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={candidateForm.skills}
                  onChange={(e) => setCandidateForm({ ...candidateForm, skills: e.target.value })}
                  placeholder="e.g., React, Node.js, TypeScript"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddCandidate(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
