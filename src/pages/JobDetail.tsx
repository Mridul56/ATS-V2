import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Upload, User, Mail, Phone, Briefcase, Calendar, MapPin, Building, FileText, X, Link, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { InterviewRoundManager } from '../components/InterviewRoundManager';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Candidate = Database['public']['Tables']['candidates']['Row'];
type JobApplication = Database['public']['Tables']['job_applications']['Row'];

interface CandidateWithApplication extends Candidate {
  application: JobApplication;
}

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ jobId, onBack }) => {
  const { profile } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<CandidateWithApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

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
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    loadJobDetails();
    loadCandidates();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    try {
      const { data: applications, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          candidate:candidates(*)
        `)
        .eq('job_id', jobId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      const candidatesWithApps = (applications || []).map((app: any) => ({
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
      }));

      setCandidates(candidatesWithApps);
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!candidateForm.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!candidateForm.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidateForm.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!candidateForm.resume_file) newErrors.resume_file = 'Resume/CV is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          job_id: jobId,
          candidate_id: candidateData.id,
          stage: 'applied',
          stage_order: 1,
        });

      if (applicationError) throw applicationError;

      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'candidate',
          entity_id: candidateData.id,
          action: 'candidate_added',
          description: `Added candidate ${candidateForm.full_name} to job ${job?.title}`,
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

  const copyPublicLink = () => {
    const publicLink = `${window.location.origin}/?apply=${jobId}`;
    navigator.clipboard.writeText(publicLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
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
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
          <div className="flex gap-4 text-sm text-slate-600 mt-1">
            <span className="flex items-center gap-1">
              <Building className="w-4 h-4" />
              {job.department}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {job.location}
            </span>
            <span className="capitalize">{job.job_type.replace('_', ' ')}</span>
          </div>
        </div>
        <button
          onClick={() => setShowAddCandidate(true)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus className="w-5 h-5" />
          Add Candidate
        </button>
      </div>

      {(job.status === 'published' || job.status === 'approved') && (
        <div className="bg-slate-900 rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Link className="w-5 h-5 text-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white mb-2">Public Application Link</h3>
              <p className="text-slate-300 text-sm mb-3">Share this link with candidates to apply directly</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/?apply=${jobId}`}
                  readOnly
                  className="flex-1 px-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg text-sm"
                />
                <button
                  onClick={copyPublicLink}
                  className="px-4 py-2 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition flex items-center gap-2 font-medium"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Job Details</h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Role Objective</p>
              <p className="text-slate-600 mt-1">{job.role_objective}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-700">Top Skills Required</p>
              <p className="text-slate-600 mt-1">{job.top_skills}</p>
            </div>

            {job.tools_required && (
              <div>
                <p className="text-sm font-medium text-slate-700">Tools Required</p>
                <p className="text-slate-600 mt-1">{job.tools_required}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Min Experience</p>
                <p className="text-slate-600 mt-1">{job.min_experience_years || 0} years</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Openings</p>
                <p className="text-slate-600 mt-1">{job.number_of_openings || 1}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Interview Rounds</p>
                <p className="text-slate-600 mt-1">{job.number_of_interview_rounds || 3} rounds</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Priority</p>
                <p className="text-slate-600 mt-1 capitalize">{job.priority}</p>
              </div>
            </div>

            {job.target_hire_date && (
              <div>
                <p className="text-sm font-medium text-slate-700">Target Hire Date</p>
                <p className="text-slate-600 mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(job.target_hire_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Statistics</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-3xl font-bold text-slate-900">{candidates.length}</p>
              <p className="text-sm text-slate-600 mt-1">Total Candidates</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-900">
                {candidates.filter(c => c.application.stage === 'applied').length}
              </p>
              <p className="text-sm text-blue-600 mt-1">New Applications</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-3xl font-bold text-purple-900">
                {candidates.filter(c => c.application.stage === 'interview').length}
              </p>
              <p className="text-sm text-purple-600 mt-1">In Interview</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-900">
                {candidates.filter(c => c.application.stage === 'offer').length}
              </p>
              <p className="text-sm text-green-600 mt-1">Offers Extended</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Candidates</h3>

        {candidates.length === 0 ? (
          <div className="text-center py-12 text-slate-600">
            <User className="w-12 h-12 mx-auto mb-3 text-slate-400" />
            <p>No candidates added yet</p>
            <p className="text-sm mt-1">Start by adding candidates to this requisition</p>
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-slate-900">{candidate.full_name}</h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStageColor(candidate.application.stage)}`}>
                        {candidate.application.stage}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-2 text-sm text-slate-600">
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
                      <div className="flex flex-wrap gap-2 mt-3">
                        {candidate.skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {selectedCandidateId === candidate.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <InterviewRoundManager
                          candidateId={candidate.id}
                          jobId={jobId}
                          applicationId={candidate.application.id}
                          onUpdate={loadCandidates}
                        />
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
                    <button
                      onClick={() => {
                        if (selectedCandidateId === candidate.id) {
                          setSelectedCandidateId(null);
                          setSelectedApplicationId(null);
                        } else {
                          setSelectedCandidateId(candidate.id);
                          setSelectedApplicationId(candidate.application.id);
                        }
                      }}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title={selectedCandidateId === candidate.id ? "Hide Interviews" : "Manage Interviews"}
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
