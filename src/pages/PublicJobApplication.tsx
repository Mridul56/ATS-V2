import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { MapPin, Briefcase, DollarSign, Calendar, Upload, CheckCircle } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

interface PublicJobApplicationProps {
  jobId: string;
}

export const PublicJobApplication: React.FC<PublicJobApplicationProps> = ({ jobId }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    current_company: '',
    current_title: '',
    years_of_experience: '',
    current_ctc: '',
    expected_ctc: '',
    notice_period_days: '',
    preferred_location: '',
    linkedin_url: '',
    skills: '',
    cover_letter: '',
    resume_file: null as File | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
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

    setForm({ ...form, resume_file: file });
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
          setForm(prev => ({
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!form.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.resume_file) newErrors.resume_file = 'Resume is required';
    if (!form.years_of_experience) newErrors.years_of_experience = 'Experience is required';
    if (!form.preferred_location.trim()) newErrors.preferred_location = 'Preferred location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let resumeUrl = null;

      if (form.resume_file) {
        const fileExt = form.resume_file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, form.resume_file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName);

        resumeUrl = publicUrl;
      }

      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .insert({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          current_company: form.current_company || null,
          current_title: form.current_title || null,
          years_of_experience: form.years_of_experience ? parseInt(form.years_of_experience) : null,
          current_ctc: form.current_ctc ? parseFloat(form.current_ctc) : null,
          expected_ctc: form.expected_ctc ? parseFloat(form.expected_ctc) : null,
          notice_period_days: form.notice_period_days ? parseInt(form.notice_period_days) : null,
          preferred_location: form.preferred_location || null,
          skills: form.skills ? form.skills.split(',').map(s => s.trim()) : [],
          linkedin_url: form.linkedin_url || null,
          resume_url: resumeUrl,
          source: 'career_site',
          current_stage: 'applied',
        })
        .select()
        .single();

      if (candidateError) throw candidateError;

      const { data: applicationData, error: applicationError } = await supabase
        .from('job_applications')
        .insert({
          job_id: jobId,
          candidate_id: candidateData.id,
          stage: 'applied',
          stage_order: 1,
          cover_letter: form.cover_letter || null,
          status_history: JSON.stringify([{
            stage: 'applied',
            timestamp: new Date().toISOString(),
            note: 'Application submitted via career site'
          }]),
        })
        .select()
        .single();

      if (applicationError) throw applicationError;

      setApplicationId(applicationData.id);
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting application:', error);
      alert(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Job Not Found</h2>
          <p className="text-slate-600">This job posting is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
          <p className="text-slate-600 mb-6">
            Thank you for applying to {job.title}. We'll review your application and get back to you soon.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-slate-600 mb-2">Track your application status:</p>
            <p className="text-xs text-slate-500 font-mono bg-white p-2 rounded border border-slate-200">
              Application ID: {applicationId?.slice(0, 8)}
            </p>
          </div>
          <a
            href="/candidate-portal"
            className="inline-block bg-slate-900 text-white px-6 py-3 rounded-lg hover:bg-slate-800 transition"
          >
            Go to Candidate Portal
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">{job.title}</h1>

          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-6">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>{job.department}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{job.job_type.replace('_', ' ')}</span>
            </div>
            {(job.salary_min || job.salary_max) && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>
                  {job.salary_min && job.salary_max
                    ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}`
                    : job.salary_min
                    ? `From $${job.salary_min.toLocaleString()}`
                    : `Up to $${job.salary_max?.toLocaleString()}`}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Job Description</h3>
              <div className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </div>
            </div>

            {job.requirements && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Requirements</h3>
                <div className="text-slate-600 whitespace-pre-wrap">
                  {job.requirements}
                </div>
              </div>
            )}

            {job.role_objective && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Role Objective</h3>
                <p className="text-slate-600">{job.role_objective}</p>
              </div>
            )}

            {job.top_skills && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Required Skills</h3>
                <p className="text-slate-600">{job.top_skills}</p>
              </div>
            )}

            {job.tools_required && (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Tools & Technologies</h3>
                <p className="text-slate-600">{job.tools_required}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Apply for this Position</h2>
          <p className="text-slate-600 mb-8">Please fill out the form below to submit your application</p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Your Resume/CV *
              </h3>
              <label className="flex flex-col items-center justify-center gap-3 px-4 py-10 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-white transition-colors bg-white">
                <Upload className="w-8 h-8 text-slate-400" />
                <div className="text-center">
                  <span className="text-base font-medium text-slate-700 block mb-1">
                    {form.resume_file ? form.resume_file.name : 'Click to upload your resume'}
                  </span>
                  <span className="text-sm text-slate-500">PDF or TXT format (Max 10MB)</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {parsing && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                  Analyzing your resume and extracting information...
                </div>
              )}
              {form.resume_file && !parsing && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm text-green-600 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Resume uploaded successfully
                </div>
              )}
              {errors.resume_file && (
                <p className="mt-3 text-sm text-red-600 text-center">{errors.resume_file}</p>
              )}
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Personal Information</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name *
                  </label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.full_name ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={form.linkedin_url}
                  onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Professional Background</h3>
              <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Company
                </label>
                <input
                  type="text"
                  value={form.current_company}
                  onChange={(e) => setForm({ ...form, current_company: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Title
                </label>
                <input
                  type="text"
                  value={form.current_title}
                  onChange={(e) => setForm({ ...form, current_title: e.target.value })}
                  placeholder="e.g., Senior Software Engineer"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>
            </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-4">Key Details</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Total Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.years_of_experience}
                    onChange={(e) => setForm({ ...form, years_of_experience: e.target.value })}
                    placeholder="e.g., 5"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white ${
                      errors.years_of_experience ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.years_of_experience && (
                    <p className="mt-1 text-sm text-red-600">{errors.years_of_experience}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Current CTC (Annual)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.current_ctc}
                    onChange={(e) => setForm({ ...form, current_ctc: e.target.value })}
                    placeholder="e.g., 1200000"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Expected CTC (Annual)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.expected_ctc}
                    onChange={(e) => setForm({ ...form, expected_ctc: e.target.value })}
                    placeholder="e.g., 1500000"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notice Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.notice_period_days}
                    onChange={(e) => setForm({ ...form, notice_period_days: e.target.value })}
                    placeholder="e.g., 30, 60, 90"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preferred Location *
                  </label>
                  <input
                    type="text"
                    value={form.preferred_location}
                    onChange={(e) => setForm({ ...form, preferred_location: e.target.value })}
                    placeholder="e.g., Remote, New York, Bangalore"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white ${
                      errors.preferred_location ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.preferred_location && (
                    <p className="mt-1 text-sm text-red-600">{errors.preferred_location}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-4">Additional Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Key Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={form.skills}
                    onChange={(e) => setForm({ ...form, skills: e.target.value })}
                    placeholder="e.g., React, Node.js, TypeScript, Python"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cover Letter (Optional)
                  </label>
                  <textarea
                    value={form.cover_letter}
                    onChange={(e) => setForm({ ...form, cover_letter: e.target.value })}
                    rows={5}
                    placeholder="Tell us why you're a great fit for this role and what motivates you to apply..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 text-white px-8 py-4 rounded-lg hover:bg-slate-800 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Submitting Your Application...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </button>
              <p className="text-center text-sm text-slate-500 mt-3">
                By submitting this form, you agree to our processing of your information
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
