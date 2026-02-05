import React, { useEffect, useState } from 'react';
import { DollarSign, CheckCircle, XCircle, Clock, LogOut, Eye, Calendar, Building, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];
type Approval = Database['public']['Tables']['approvals']['Row'];

interface JobWithApproval extends Job {
  approval: Approval | null;
  hiring_manager_name?: string;
}

export const FinanceDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [requisitions, setRequisitions] = useState<JobWithApproval[]>([]);
  const [selectedRequisition, setSelectedRequisition] = useState<JobWithApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [comments, setComments] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    loadRequisitions();
  }, [filterStatus]);

  const loadRequisitions = async () => {
    try {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          approvals!inner(*)
        `)
        .order('created_at', { ascending: false });

      if (filterStatus === 'pending') {
        query = query.eq('status', 'pending_approval');
      } else if (filterStatus === 'approved') {
        query = query.eq('status', 'approved');
      } else if (filterStatus === 'rejected') {
        query = query.eq('status', 'draft');
      }

      const { data: jobsData, error: jobsError } = await query;

      if (jobsError) throw jobsError;

      const jobsWithDetails = await Promise.all(
        (jobsData || []).map(async (job: any) => {
          const { data: hmData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', job.created_by)
            .maybeSingle();

          const approval = Array.isArray(job.approvals) ? job.approvals[0] : job.approvals;

          if (filterStatus === 'approved' && approval?.status !== 'approved') return null;
          if (filterStatus === 'rejected' && approval?.status !== 'rejected') return null;

          return {
            ...job,
            approval,
            hiring_manager_name: hmData?.full_name || 'Unknown',
          };
        })
      );

      setRequisitions(jobsWithDetails.filter(Boolean) as JobWithApproval[]);
    } catch (error) {
      console.error('Error loading requisitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (requisition: JobWithApproval, action: 'approve' | 'reject') => {
    setSelectedRequisition(requisition);
    setShowReviewModal(true);
  };

  const submitReview = async (action: 'approve' | 'reject') => {
    if (!selectedRequisition) return;

    setProcessing(true);

    try {
      const newStatus = action === 'approve' ? 'approved' : 'draft';

      await supabase
        .from('jobs')
        .update({ status: newStatus })
        .eq('id', selectedRequisition.id);

      if (selectedRequisition.approval) {
        await supabase
          .from('approvals')
          .update({
            status: action === 'approve' ? 'approved' : 'rejected',
            approver_id: profile?.id,
            comments: comments || null,
            approved_at: new Date().toISOString(),
          })
          .eq('id', selectedRequisition.approval.id);
      }

      await supabase
        .from('activity_logs')
        .insert({
          entity_type: 'job',
          entity_id: selectedRequisition.id,
          action: `requisition_${action}d`,
          description: `Finance ${action}d requisition for ${selectedRequisition.title}`,
          performed_by: profile?.id,
        });

      setShowReviewModal(false);
      setSelectedRequisition(null);
      setComments('');
      loadRequisitions();
    } catch (error: any) {
      console.error('Error processing review:', error);
      alert(error.message || 'Failed to process review');
    } finally {
      setProcessing(false);
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
              <h1 className="text-3xl font-bold text-slate-900">Approver Dashboard</h1>
              <p className="text-slate-600 mt-1">Review and manage requisitions</p>
            </div>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'approved'
                  ? 'bg-green-100 text-green-700 border-2 border-green-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'rejected'
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Pending Approval</p>
                  <p className="text-3xl font-bold text-slate-900">{requisitions.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-700" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">High Priority</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {requisitions.filter(r => r.priority === 'high').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-700" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Total Openings</p>
                  <p className="text-3xl font-bold text-slate-900">
                    {requisitions.reduce((sum, r) => sum + (r.number_of_openings || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building className="w-6 h-6 text-blue-700" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            {filterStatus === 'pending' && 'Pending Requisitions'}
            {filterStatus === 'approved' && 'Approved Requisitions'}
            {filterStatus === 'rejected' && 'Rejected Requisitions'}
            {filterStatus === 'all' && 'All Requisitions'}
          </h2>

          {requisitions.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {filterStatus === 'pending' && 'All caught up!'}
                {filterStatus === 'approved' && 'No approved requisitions'}
                {filterStatus === 'rejected' && 'No rejected requisitions'}
                {filterStatus === 'all' && 'No requisitions found'}
              </h3>
              <p className="text-slate-600">
                {filterStatus === 'pending' && 'No pending requisitions to review at the moment.'}
                {filterStatus === 'approved' && 'You have not approved any requisitions yet.'}
                {filterStatus === 'rejected' && 'You have not rejected any requisitions yet.'}
                {filterStatus === 'all' && 'No requisitions available.'}
              </p>
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
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(req.priority)}`}>
                          {req.priority} priority
                        </span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-700 capitalize">
                          {req.role_type.replace('_', ' ')}
                        </span>
                        {req.approval?.approver_type && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700">
                            {req.approval.approver_type}
                          </span>
                        )}
                        {req.approval?.status === 'approved' && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                            Approved
                          </span>
                        )}
                        {req.approval?.status === 'rejected' && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                            Rejected
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Building className="w-4 h-4" />
                          {req.department}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {req.location}
                        </div>
                        <span>•</span>
                        <span>{req.number_of_openings || 1} opening{req.number_of_openings !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span className="capitalize">{req.job_type.replace('_', ' ')}</span>
                      </div>
                      <p className="text-slate-600 mb-2">
                        <span className="font-medium">Requested by:</span> {req.hiring_manager_name}
                      </p>
                      {req.replacement_employee && (
                        <p className="text-slate-600 mb-2">
                          <span className="font-medium">Replacing:</span> {req.replacement_employee}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-4 mb-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Role Objective</p>
                    <p className="text-slate-600 text-sm">{req.role_objective}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Top Skills</p>
                      <p className="text-slate-600 text-sm">{req.top_skills}</p>
                    </div>
                    {req.tools_required && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Tools Required</p>
                        <p className="text-slate-600 text-sm">{req.tools_required}</p>
                      </div>
                    )}
                    {req.min_experience_years && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Min Experience</p>
                        <p className="text-slate-600 text-sm">{req.min_experience_years} years</p>
                      </div>
                    )}
                    {req.target_hire_date && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Target Hire Date</p>
                        <p className="text-slate-600 text-sm flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(req.target_hire_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {req.target_joining_timeline && (
                      <div>
                        <p className="text-sm font-medium text-slate-700 mb-1">Target Joining</p>
                        <p className="text-slate-600 text-sm flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(req.target_joining_timeline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {req.approval?.comments && (
                    <div className="border-t border-slate-200 pt-4 mb-4">
                      <p className="text-sm font-medium text-slate-700 mb-1">Comments</p>
                      <p className="text-slate-600 text-sm">{req.approval.comments}</p>
                    </div>
                  )}

                  {req.approval?.approved_at && (
                    <div className="mb-4 text-sm text-slate-600">
                      <span className="font-medium">Reviewed on:</span>{' '}
                      {new Date(req.approval.approved_at).toLocaleDateString()} at{' '}
                      {new Date(req.approval.approved_at).toLocaleTimeString()}
                    </div>
                  )}

                  {filterStatus === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={() => handleReview(req, 'approve')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        <CheckCircle className="w-5 h-5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(req, 'reject')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                      >
                        <XCircle className="w-5 h-5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showReviewModal && selectedRequisition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              Review Requisition
            </h3>
            <p className="text-slate-600 mb-4">
              You are about to review the requisition for <span className="font-semibold">{selectedRequisition.title}</span>.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Add any comments or feedback..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedRequisition(null);
                  setComments('');
                }}
                disabled={processing}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitReview('reject')}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => submitReview('approve')}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
