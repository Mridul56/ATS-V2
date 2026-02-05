import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, DollarSign, Calendar, Plus, TrendingUp } from 'lucide-react';
import type { Database } from '../lib/database.types';

type Offer = Database['public']['Tables']['offers']['Row'] & {
  job_applications: {
    candidates: {
      full_name: string;
      email: string;
    };
    jobs: {
      title: string;
    };
  };
};

export const Offers: React.FC = () => {
  const { profile } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          job_applications!inner(
            candidates!inner(full_name, email),
            jobs!inner(title)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data as any || []);
    } catch (error) {
      console.error('Error loading offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Offer['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 text-slate-700';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-700';
      case 'approved':
        return 'bg-blue-100 text-blue-700';
      case 'sent':
        return 'bg-cyan-100 text-cyan-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'expired':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredOffers = offers.filter(
    (offer) => statusFilter === 'all' || offer.status === statusFilter
  );

  const canCreateOffers =
    profile?.role === 'admin' ||
    profile?.role === 'recruiter' ||
    profile?.role === 'hiring_manager';

  const canViewFinancials =
    profile?.role === 'admin' ||
    profile?.role === 'recruiter' ||
    profile?.role === 'hiring_manager' ||
    profile?.role === 'finance';

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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Offers</h2>
          <p className="text-slate-600">Manage job offers and compensation</p>
        </div>
        {canCreateOffers && (
          <button className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
            <Plus className="w-5 h-5" />
            <span>Create Offer</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredOffers.map((offer) => {
          const totalCompensation =
            Number(offer.fixed_ctc) + Number(offer.variable_ctc) + Number(offer.joining_bonus);

          return (
            <div
              key={offer.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {offer.job_applications.candidates.full_name}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {offer.job_applications.jobs.title}
                  </p>
                  <p className="text-sm text-slate-500">
                    {offer.job_applications.candidates.email}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    offer.status
                  )}`}
                >
                  {offer.status.replace('_', ' ')}
                </span>
              </div>

              {canViewFinancials && (
                <div className="space-y-3 mb-4 p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Fixed CTC</span>
                    <span className="font-semibold text-slate-900">
                      ${Number(offer.fixed_ctc).toLocaleString()}
                    </span>
                  </div>
                  {offer.variable_ctc > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Variable</span>
                      <span className="font-semibold text-slate-900">
                        ${Number(offer.variable_ctc).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {offer.joining_bonus > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Joining Bonus</span>
                      <span className="font-semibold text-slate-900">
                        ${Number(offer.joining_bonus).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {offer.equity && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Equity</span>
                      <span className="font-semibold text-slate-900">{offer.equity}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Total Package</span>
                    <span className="text-lg font-bold text-slate-900">
                      ${totalCompensation.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {offer.start_date && (
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Calendar className="w-4 h-4" />
                    <span>Start Date: {new Date(offer.start_date).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <FileText className="w-4 h-4" />
                  <span>Version {offer.version}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  Created {new Date(offer.created_at).toLocaleDateString()}
                </span>
                <button className="text-sm font-medium text-slate-900 hover:text-slate-700">
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOffers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No offers found</h3>
          <p className="text-slate-600 mb-6">
            {statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start creating offers for your top candidates'}
          </p>
          {canCreateOffers && statusFilter === 'all' && (
            <button className="inline-flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition">
              <Plus className="w-5 h-5" />
              <span>Create Offer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
