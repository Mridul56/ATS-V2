import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

export const QuestionBankManager: React.FC = () => {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || q.question_type === filterType;
    const matchesDept = filterDepartment === 'all' || q.department === filterDepartment;
    return matchesSearch && matchesType && matchesDept;
  });

  const canManage = profile?.role === 'admin' || profile?.role === 'recruiter' || profile?.role === 'hiring_manager';

  const getDepartments = () => {
    const depts = new Set(questions.map((q) => q.department).filter(Boolean));
    return Array.from(depts);
  };

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
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Question Bank</h2>
          <p className="text-slate-600">Manage interview questions for structured evaluations</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Question</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="technical">Technical</option>
            <option value="behavioral">Behavioral</option>
            <option value="case_based">Case Based</option>
            <option value="situational">Situational</option>
          </select>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          >
            <option value="all">All Departments</option>
            {getDepartments().map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredQuestions.map((question) => (
          <div
            key={question.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-slate-900 font-medium mb-2">{question.question_text}</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs capitalize">
                    {question.question_type.replace('_', ' ')}
                  </span>
                  {question.difficulty && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs capitalize">
                      {question.difficulty}
                    </span>
                  )}
                  {question.department && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      {question.department}
                    </span>
                  )}
                  {question.role && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      {question.role}
                    </span>
                  )}
                  {question.experience_level && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs capitalize">
                      {question.experience_level}
                    </span>
                  )}
                </div>
                {question.evaluation_criteria && (
                  <p className="text-sm text-slate-600 mt-2">
                    <span className="font-medium">Evaluation:</span> {question.evaluation_criteria}
                  </p>
                )}
              </div>
              {canManage && (
                <div className="flex items-center space-x-2 ml-4">
                  <button className="p-2 text-slate-400 hover:text-slate-600 transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-600 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredQuestions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-600">No questions found</p>
        </div>
      )}
    </div>
  );
};
