import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Jobs } from './pages/Jobs';
import { Candidates } from './pages/Candidates';
import { Interviews } from './pages/Interviews';
import { Offers } from './pages/Offers';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Careers } from './pages/Careers';
import { JobApplication } from './pages/JobApplication';
import { PublicJobApplication } from './pages/PublicJobApplication';
import { CandidateDashboard } from './pages/CandidateDashboard';
import { CandidatePortal } from './pages/CandidatePortal';
import { HiringManagerDashboard } from './pages/HiringManagerDashboard';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { InterviewerDashboard } from './pages/InterviewerDashboard';
import { Layout } from './components/Layout';

const AppContent: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('apply');
  });
  const [viewMode, setViewMode] = useState<'careers' | 'application' | 'success' | 'login' | 'app'>(() => {
    const params = new URLSearchParams(window.location.search);
    const applyJobId = params.get('apply');
    if (applyJobId) {
      return 'application';
    }
    const saved = localStorage.getItem('viewMode');
    if (saved === 'login' || saved === 'careers') {
      localStorage.removeItem('viewMode');
      return saved;
    }
    return 'login';
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!user) {
    if (viewMode === 'careers') {
      return (
        <Careers
          onApply={(jobId) => {
            setSelectedJobId(jobId);
            setViewMode('application');
          }}
          onSignIn={() => setViewMode('login')}
        />
      );
    }

    if (viewMode === 'application' && selectedJobId) {
      return <PublicJobApplication jobId={selectedJobId} />;
    }

    if (viewMode === 'success') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-slate-200 p-12 max-w-md text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted!</h2>
            <p className="text-slate-600 mb-6">
              Thank you for applying! Your account has been created and you can now track your application status.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return <Login />;
  }

  if (profile?.role === 'candidate') {
    return (
      <Layout currentPage="portal" onNavigate={() => {}}>
        <CandidatePortal />
      </Layout>
    );
  }

  if (profile?.role === 'interviewer') {
    return (
      <Layout currentPage="dashboard" onNavigate={() => {}}>
        <InterviewerDashboard />
      </Layout>
    );
  }

  if (profile?.role === 'hiring_manager') {
    return <HiringManagerDashboard />;
  }

  if (profile?.role === 'finance' || profile?.role === 'approver') {
    return <FinanceDashboard />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'jobs':
        return <Jobs />;
      case 'candidates':
        return <Candidates />;
      case 'interviews':
        return <Interviews />;
      case 'offers':
        return <Offers />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
