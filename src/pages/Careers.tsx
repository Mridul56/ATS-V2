import React, { useEffect, useState } from 'react';
import { Briefcase, MapPin, Clock, DollarSign, Building2, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Job = Database['public']['Tables']['jobs']['Row'];

interface CareersProps {
  onApply: (jobId: string) => void;
  onSignIn: () => void;
}

export const Careers: React.FC<CareersProps> = ({ onApply, onSignIn }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  useEffect(() => {
    loadPublishedJobs();
  }, []);

  const loadPublishedJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const departments = ['all', ...new Set(jobs.map(job => job.department))];
  const locations = ['all', ...new Set(jobs.map(job => job.location))];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || job.department === selectedDepartment;
    const matchesLocation = selectedLocation === 'all' || job.location === selectedLocation;
    return matchesSearch && matchesDepartment && matchesLocation;
  });

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3">Join Our Team</h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Discover exciting opportunities and help us build the future. We're always looking for talented individuals.
              </p>
            </div>
            <button
              onClick={onSignIn}
              className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="Search jobs by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />

          <div className="flex gap-4">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="flex-1 px-4 py-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>
                  {loc === 'all' ? 'All Locations' : loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredJobs.length === 0 ? (
          <div className="text-center py-16">
            <Briefcase className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No jobs found</h3>
            <p className="text-slate-600">
              {searchTerm || selectedDepartment !== 'all' || selectedLocation !== 'all'
                ? 'Try adjusting your filters to see more results'
                : 'No open positions at the moment. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 hover:border-slate-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {job.department}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {job.job_type.replace('_', ' ')}
                      </div>
                      {job.salary_min && job.salary_max && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          ${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {job.number_of_openings || 1} {job.number_of_openings === 1 ? 'opening' : 'openings'}
                  </span>
                </div>

                <p className="text-slate-700 mb-4 line-clamp-3">{job.description}</p>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-sm text-slate-500">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => onApply(job.id)}
                    className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                  >
                    Apply Now
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-slate-600">
          <p>Already applied? <button onClick={onSignIn} className="text-slate-900 font-medium hover:underline">Sign in</button> to track your application status</p>
        </div>
      </div>
    </div>
  );
};
