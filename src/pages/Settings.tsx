import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Mail, Shield, Bell, Building, BookOpen } from 'lucide-react';
import type { Database } from '../lib/database.types';
import { QuestionBankManager } from '../components/QuestionBankManager';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const Settings: React.FC = () => {
  const { profile: currentProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'team') {
      loadUsers();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: Users },
    { id: 'team', name: 'Team', icon: Building },
    { id: 'questions', name: 'Question Bank', icon: BookOpen },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
  ];

  const isAdmin = currentProfile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Settings</h2>
        <p className="text-slate-600">Manage your account and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={currentProfile?.full_name || ''}
                        readOnly
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={currentProfile?.email || ''}
                        readOnly
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Role
                      </label>
                      <input
                        type="text"
                        value={currentProfile?.role?.replace('_', ' ') || ''}
                        readOnly
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 capitalize"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Department
                      </label>
                      <input
                        type="text"
                        value={currentProfile?.department || 'Not specified'}
                        readOnly
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
                  {isAdmin && (
                    <button className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition text-sm">
                      Invite Member
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-slate-700 font-medium">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{user.full_name}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm capitalize">
                            {user.role.replace('_', ' ')}
                          </span>
                          {isAdmin && user.id !== currentProfile?.id && (
                            <button className="text-sm text-slate-600 hover:text-slate-900">
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Email Notifications
                  </h3>
                  <div className="space-y-4">
                    {[
                      { id: 'new_applications', label: 'New applications received' },
                      { id: 'interview_scheduled', label: 'Interview scheduled' },
                      { id: 'offer_updates', label: 'Offer status updates' },
                      { id: 'feedback_requested', label: 'Feedback requested' },
                      { id: 'approval_required', label: 'Approval required' },
                    ].map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" defaultChecked className="sr-only peer" />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-slate-900 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'questions' && (
              <div>
                <QuestionBankManager />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Change Password</p>
                          <p className="text-sm text-slate-600">Update your password regularly</p>
                        </div>
                        <button className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                          Update
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                          <p className="text-sm text-slate-600">Add an extra layer of security</p>
                        </div>
                        <button className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                          Enable
                        </button>
                      </div>
                    </div>
                    <div className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">Active Sessions</p>
                          <p className="text-sm text-slate-600">Manage your active sessions</p>
                        </div>
                        <button className="px-4 py-2 text-sm font-medium text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition">
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
