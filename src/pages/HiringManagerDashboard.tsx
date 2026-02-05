import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Calendar, AlertCircle, CheckCircle, Clock, LogOut, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';
import { HiringManagerCandidates } from './HiringManagerCandidates';

type Job = Database['public']['Tables']['jobs']['Row'];

export const HiringManagerDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [requisitions, setRequisitions] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    job_title: '',
    department: '',
    location: '',
    employment_type: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'internship',
    role_type: 'new_role' as 'new_role' | 'backfill',
    replacement_employee: '',
    top_skills: '',
    minimum_experience: '',
    tools_required: '',
    role_objective: '',
    target_joining_timeline: '',
    openings: '1',
    priority: 'medium' as 'high' | 'medium' | 'low',
    target_hire_date: '',
    number_of_interview_rounds: '3',
    panelist_names: '',
    approver_type: 'CHRO' as 'CHRO' | 'CFO',
    approver_email: '',
  });

  const departments = [
    'Acquisition',
    'AML',
    'Analyst',
    'B 2 B',
    'B2C _ EL Sales',
    'BDM',
    'BizOps',
    "CEO's Office",
    'Collections',
    'Compliance',
    'Content and Branding',
    'Credit & Risk',
    'Customer Excellence',
    'Dispute & Chargeback',
    'Engineering',
    'Finance',
    'Fraud & Risk',
    'Growth',
    'Growth & Marketing',
    'HRBP',
    'IT',
    'Legal',
    'Marketing',
    'Operations',
    'People',
    'Product',
    'Product Design',
    'Quality',
    'Retention',
    'Retention & Partnership',
    'TA',
  ];

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadRequisitions();
  }, []);

  const loadRequisitions = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('created_by', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequisitions(data || []);
    } catch (error) {
      console.error('Error loading requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.job_title.trim()) newErrors.job_title = 'Job title is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.top_skills.trim()) newErrors.top_skills = 'Top skills are required';
    if (!formData.role_objective.trim()) newErrors.role_objective = 'Role objective is required';
    if (!formData.openings || parseInt(formData.openings) < 1) {
      newErrors.openings = 'Number of openings must be at least 1';
    }

    if (formData.role_type === 'backfill' && !formData.replacement_employee.trim()) {
      newErrors.replacement_employee = 'Replacement employee name is required for backfill roles';
    }

    if (!formData.approver_email.trim()) {
      newErrors.approver_email = 'Approver email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.approver_email)) {
      newErrors.approver_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: formData.job_title,
          department: formData.department,
          location: formData.location,
          job_type: formData.employment_type,
          role_type: formData.role_type,
          replacement_employee: formData.role_type === 'backfill' ? formData.replacement_employee : null,
          top_skills: formData.top_skills,
          min_experience_years: formData.minimum_experience ? parseInt(formData.minimum_experience) : null,
          tools_required: formData.tools_required || null,
          role_objective: formData.role_objective,
          target_joining_timeline: formData.target_joining_timeline || null,
          number_of_openings: parseInt(formData.openings),
          number_of_interview_rounds: parseInt(formData.number_of_interview_rounds),
          panelist_names: formData.panelist_names || null,
          priority: formData.priority,
          target_hire_date: formData.target_hire_date || null,
          description: formData.role_objective,
          status: 'pending_approval',
          hiring_manager_id: profile?.id,
          created_by: profile?.id || '',
        })
        .select()
        .single();

      if (jobError) throw jobError;

      await supabase
        .from('approvals')
        .insert({
          job_id: jobData.id,
          status: 'pending',
          approver_type: formData.approver_type,
          approver_email: formData.approver_email,
          notification_sent: false,
        });

      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'job',
          entity_id: jobData.id,
          action: 'requisition_created',
          description: `Created requisition for ${formData.job_title}`,
          performed_by: profile?.id,
        });

      try {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-approval-notification`;
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approver_email: formData.approver_email,
            approver_type: formData.approver_type,
            job_title: formData.job_title,
            department: formData.department,
            hiring_manager_name: profile?.full_name,
            job_id: jobData.id,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setFormData({
        job_title: '',
        department: '',
        location: '',
        employment_type: 'full_time',
        role_type: 'new_role',
        replacement_employee: '',
        top_skills: '',
        minimum_experience: '',
        tools_required: '',
        role_objective: '',
        target_joining_timeline: '',
        openings: '1',
        priority: 'medium',
        target_hire_date: '',
        number_of_interview_rounds: '3',
        panelist_names: '',
        approver_type: 'CHRO',
        approver_email: '',
      });

      setShowForm(false);
      loadRequisitions();
    } catch (error: any) {
      console.error('Error creating requisition:', error);
      setErrors({ submit: error.message || 'Failed to create requisition. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'published':
        return 'bg-blue-100 text-blue-700';
      case 'closed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  if (selectedJobId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <HiringManagerCandidates jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Hiring Manager Dashboard</h1>
              <p className="text-slate-600 mt-1">Welcome back, {profile?.full_name}!</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                {showForm ? 'Cancel' : 'Create Requisition'}
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-8 mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Create New Requisition</h2>

            {errors.submit && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {errors.submit}
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.job_title ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.job_title && <p className="mt-1 text-sm text-red-600">{errors.job_title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.department ? 'border-red-500' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.location ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Employment Type *
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
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
                    Role Type *
                  </label>
                  <select
                    value={formData.role_type}
                    onChange={(e) => setFormData({ ...formData, role_type: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="new_role">New Role</option>
                    <option value="backfill">Backfill</option>
                  </select>
                </div>

                {formData.role_type === 'backfill' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Replacement Employee *
                    </label>
                    <input
                      type="text"
                      value={formData.replacement_employee}
                      onChange={(e) => setFormData({ ...formData, replacement_employee: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                        errors.replacement_employee ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="Employee being replaced"
                    />
                    {errors.replacement_employee && <p className="mt-1 text-sm text-red-600">{errors.replacement_employee}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Experience (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minimum_experience}
                    onChange={(e) => setFormData({ ...formData, minimum_experience: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Openings *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.openings}
                    onChange={(e) => setFormData({ ...formData, openings: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                      errors.openings ? 'border-red-500' : 'border-slate-300'
                    }`}
                  />
                  {errors.openings && <p className="mt-1 text-sm text-red-600">{errors.openings}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Interview Rounds *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.number_of_interview_rounds}
                    onChange={(e) => setFormData({ ...formData, number_of_interview_rounds: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-slate-500">Number of interview rounds for this position</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Panelist Names
                  </label>
                  <input
                    type="text"
                    value={formData.panelist_names}
                    onChange={(e) => setFormData({ ...formData, panelist_names: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    placeholder="Enter panelist names (comma separated)"
                  />
                  <p className="mt-1 text-sm text-slate-500">Names of interview panelists for this position</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Priority *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
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
                    Target Joining Timeline
                  </label>
                  <input
                    type="date"
                    value={formData.target_joining_timeline}
                    onChange={(e) => setFormData({ ...formData, target_joining_timeline: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Approval Workflow</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Approver Type *
                    </label>
                    <select
                      value={formData.approver_type}
                      onChange={(e) => setFormData({ ...formData, approver_type: e.target.value as 'CHRO' | 'CFO' })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                    >
                      <option value="CHRO">CHRO (Chief Human Resources Officer)</option>
                      <option value="CFO">CFO (Chief Financial Officer)</option>
                    </select>
                    <p className="mt-1 text-sm text-slate-500">Select who should approve this requisition</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Approver Email *
                    </label>
                    <input
                      type="email"
                      value={formData.approver_email}
                      onChange={(e) => setFormData({ ...formData, approver_email: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                        errors.approver_email ? 'border-red-500' : 'border-slate-300'
                      }`}
                      placeholder="approver@company.com"
                    />
                    {errors.approver_email && <p className="mt-1 text-sm text-red-600">{errors.approver_email}</p>}
                    <p className="mt-1 text-sm text-slate-500">Email notification will be sent to this address</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Top Skills Required *
                </label>
                <textarea
                  value={formData.top_skills}
                  onChange={(e) => setFormData({ ...formData, top_skills: e.target.value })}
                  rows={3}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.top_skills ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="List the key skills required for this role"
                />
                {errors.top_skills && <p className="mt-1 text-sm text-red-600">{errors.top_skills}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tools Required
                </label>
                <textarea
                  value={formData.tools_required}
                  onChange={(e) => setFormData({ ...formData, tools_required: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="List tools, technologies, or software the candidate should know"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Role Objective *
                </label>
                <textarea
                  value={formData.role_objective}
                  onChange={(e) => setFormData({ ...formData, role_objective: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent ${
                    errors.role_objective ? 'border-red-500' : 'border-slate-300'
                  }`}
                  placeholder="Describe the main purpose and objectives of this role"
                />
                {errors.role_objective && <p className="mt-1 text-sm text-red-600">{errors.role_objective}</p>}
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Submit Requisition'}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">My Requisitions</h2>

          {requisitions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No requisitions yet</h3>
              <p className="text-slate-600 mb-6">
                Create your first requisition to start the hiring process.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Requisition
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {requisitions.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-slate-900">{req.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(req.status)}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(req.priority)}`}>
                          {req.priority} priority
                        </span>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600">
                        <span>{req.department}</span>
                        <span>•</span>
                        <span>{req.location}</span>
                        <span>•</span>
                        <span>{req.number_of_openings || 1} opening{req.number_of_openings !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="capitalize">{req.role_type.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-700 mb-4 line-clamp-2">{req.role_objective}</p>

                  <div className="mb-4 space-y-2">
                    {req.number_of_interview_rounds && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="font-medium text-slate-700">Interview Rounds:</span>
                        <span className="text-slate-600">{req.number_of_interview_rounds}</span>
                      </div>
                    )}
                    {req.panelist_names && (
                      <div className="flex items-start gap-2 text-sm">
                        <span className="font-medium text-slate-700">Panelists:</span>
                        <span className="text-slate-600">{req.panelist_names}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Created {new Date(req.created_at).toLocaleDateString()}
                      </div>
                      {req.target_hire_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Target: {new Date(req.target_hire_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {req.status === 'approved' && (
                      <button
                        onClick={() => setSelectedJobId(req.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
                      >
                        <Users className="w-4 h-4" />
                        View Candidates
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
