import React, { useEffect, useState } from 'react';
import { ArrowLeft, Upload, Briefcase, User, Mail, Phone, FileText, Linkedin, Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

interface JobApplicationProps {
  jobId: string;
  onBack: () => void;
  onSuccess: () => void;
}

export const JobApplication: React.FC<JobApplicationProps> = ({ jobId, onBack, onSuccess }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    currentCompany: '',
    currentTitle: '',
    yearsOfExperience: '',
    linkedinUrl: '',
    resumeUrl: '',
    skills: '',
    coverLetter: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    loadJob();
  }, [jobId]);

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('is_published', true)
        .maybeSingle();

      if (error) throw error;
      setJob(data);
    } catch (error) {
      console.error('Error loading job:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setErrors({ ...errors, resume: 'Please upload a PDF or TXT file' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors({ ...errors, resume: 'File size must be less than 10MB' });
      return;
    }

    setUploadedFile(file);
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
          setFormData({
            ...formData,
            fullName: parsedData.fullName || formData.fullName,
            email: parsedData.email || formData.email,
            phone: parsedData.phone || formData.phone,
            currentCompany: parsedData.currentCompany || formData.currentCompany,
          });
        }

        setParsing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error parsing resume:', error);
      setErrors({ ...errors, resume: 'Failed to parse resume' });
      setParsing(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.skills.trim()) newErrors.skills = 'Skills are required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      let resumeStorageUrl = formData.resumeUrl;

      if (uploadedFile) {
        const fileExt = uploadedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(fileName, uploadedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('resumes')
          .getPublicUrl(fileName);

        resumeStorageUrl = urlData.publicUrl;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErrors({ email: 'This email is already registered. Please sign in instead.' });
          setSubmitting(false);
          return;
        }
        throw authError;
      }

      if (!authData.user) throw new Error('Failed to create user');

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'candidate',
        });

      if (profileError) throw profileError;

      const skillsArray = formData.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .insert({
          user_id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          phone: formData.phone,
          current_company: formData.currentCompany || null,
          current_title: formData.currentTitle || null,
          years_of_experience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
          linkedin_url: formData.linkedinUrl || null,
          resume_url: resumeStorageUrl || null,
          skills: skillsArray,
          source: 'website',
          current_stage: 'applied',
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
          cover_letter: formData.coverLetter || null,
        });

      if (applicationError) throw applicationError;

      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'job_application',
          entity_id: candidateData.id,
          action: 'application_submitted',
          description: `${formData.fullName} applied for ${job?.title}`,
          performed_by: authData.user.id,
        });

      onSuccess();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      setErrors({ submit: error.message || 'Failed to submit application. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Job Not Found</h2>
          <button onClick={onBack} className="text-slate-600 hover:text-slate-900">
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Jobs
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-100 rounded-lg">
              <Briefcase className="w-8 h-8 text-slate-700" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
              <div className="flex gap-4 text-sm text-slate-600">
                <span>{job.department}</span>
                <span>•</span>
                <span>{job.location}</span>
                <span>•</span>
                <span>{job.job_type.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Application Details</h2>

          {errors.submit && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {errors.submit}
            </div>
          )}

          <div className="space-y-6">
            <div className="mb-6 p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Resume/CV (Optional)
                </div>
              </label>
              <input
                type="file"
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-slate-900 file:text-white hover:file:bg-slate-800 file:cursor-pointer"
              />
              <p className="mt-2 text-xs text-slate-500">
                Upload your resume and we'll automatically fill in your details. Supported formats: PDF, TXT (Max 10MB)
              </p>
              {parsing && (
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                  Parsing resume...
                </div>
              )}
              {uploadedFile && !parsing && (
                <div className="mt-2 text-sm text-green-600">
                  ✓ {uploadedFile.name} uploaded successfully
                </div>
              )}
              {errors.resume && <p className="mt-1 text-sm text-red-600">{errors.resume}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name *
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.fullName ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email *
                  </div>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone *
                  </div>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-slate-300'
                  }`}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Create a password to track your application"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Current Company
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.currentCompany}
                  onChange={(e) => setFormData({ ...formData, currentCompany: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Current Title
                </label>
                <input
                  type="text"
                  value={formData.currentTitle}
                  onChange={(e) => setFormData({ ...formData, currentTitle: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.yearsOfExperience}
                  onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-4 h-4" />
                    LinkedIn Profile
                  </div>
                </label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resume URL (Alternative)
                </div>
              </label>
              <input
                type="url"
                value={formData.resumeUrl}
                onChange={(e) => setFormData({ ...formData, resumeUrl: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Or paste a link to your resume (Google Drive, Dropbox, etc.)"
                disabled={!!uploadedFile}
              />
              <p className="mt-1 text-sm text-slate-500">
                {uploadedFile ? 'File uploaded - URL field disabled' : 'Or share a link to your resume from cloud storage'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Skills * (comma separated)
              </label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                  errors.skills ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="JavaScript, React, Node.js, Python"
              />
              {errors.skills && <p className="mt-1 text-sm text-red-600">{errors.skills}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Cover Letter
              </label>
              <textarea
                value={formData.coverLetter}
                onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Tell us why you're interested in this position and what makes you a great fit..."
              />
            </div>
          </div>

          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
