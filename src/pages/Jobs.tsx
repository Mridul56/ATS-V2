import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, MapPin, Briefcase, DollarSign, Filter } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { JobForm } from '../components/JobForm';
import { JobDetail } from './JobDetail';

type Job = Database['public']['Tables']['jobs']['Row'];

interface JobsProps {
  onJobSelect?: (jobId: string) => void;
}

export const Jobs: React.FC<JobsProps> = ({ onJobSelect }) => {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      let query = supabase
        .from('jobs')
        .select('*');

      if (profile?.role === 'recruiter') {
        query = query.in('status', ['approved', 'published', 'closed']);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'published':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const canCreateJob = profile?.role === 'admin' || profile?.role === 'recruiter';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (selectedJobId) {
    return <JobDetail jobId={selectedJobId} onBack={() => setSelectedJobId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Job Requisitions</h2>
          <p className="text-slate-600">Manage your job openings and requisitions</p>
        </div>
        {canCreateJob && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Create Job</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search jobs by title or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition cursor-pointer"
            onClick={() => {
              if (profile?.role === 'recruiter' || profile?.role === 'admin') {
                setSelectedJobId(job.id);
              } else {
                onJobSelect?.(job.id);
              }
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">{job.title}</h3>
                <p className="text-sm text-slate-600">{job.requisition_id}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  job.status
                )}`}
              >
                {job.status.replace('_', ' ')}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <Briefcase className="w-4 h-4" />
                <span>{job.department}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              {(job.salary_min || job.salary_max) && (
                <div className="flex items-center space-x-2 text-sm text-slate-600">
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

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Created {new Date(job.created_at).toLocaleDateString()}
              </span>
              <span className="text-xs font-medium text-slate-700 capitalize">
                {job.job_type.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No jobs found</h3>
          <p className="text-slate-600 mb-6">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first job requisition'}
          </p>
          {canCreateJob && !searchTerm && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Create Job</span>
            </button>
          )}
        </div>
      )}

      {showCreateModal && (
        <JobForm
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => loadJobs()}
        />
      )}
    </div>
  );
};
