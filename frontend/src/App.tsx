import { Briefcase, Sparkles, Building2, List, Settings } from 'lucide-react';
import { type Internship } from './components/InternshipCard';
import { InternshipList } from './components/InternshipList';
import { ResumeUpload } from './components/ResumeUpload';
import { RunButton } from './components/RunButton';
import { CompaniesPage } from './components/CompaniesPage';
import { PresetsPage } from './components/PresetsPage';
import { useGlobalState } from './store/global';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';

export function Header() {
  const [isRunning, setIsRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const { setInternships } = useGlobalState();
  const location = useLocation();

  const handleRun = async (presetName?: string) => {
    setIsRunning(true);
    setStatusMessage(presetName ? `Starting search with preset: ${presetName}...` : 'Starting search...');

    const url = new URL('http://localhost:3000/api/run');
    if (presetName) {
      url.searchParams.append('preset', presetName);
    }

    const eventSource = new EventSource(url.toString());

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'status') {
        setStatusMessage(data.message);
      } else if (data.type === 'internship') {
        const newInternship: Internship = {
          ...data.internship,
          companyDetails: data.company?.details,
          companyAnalysis: data.company?.analysis
        };
        setInternships(prev => [newInternship, ...prev]);
        setStatusMessage(`Found new internship: ${data.internship.company}`);
      } else if (data.type === 'complete') {
        setStatusMessage(data.message);
        eventSource.close();
        setIsRunning(false);
        setTimeout(() => setStatusMessage(''), 5000);
      } else if (data.type === 'error') {
        console.error('SSE Error:', data.message);
        setStatusMessage(`Error: ${data.message}`);
        eventSource.close();
        setIsRunning(false);
      }
    };

    eventSource.onerror = () => {
      console.error('SSE Connection Error');
      eventSource.close();
      setIsRunning(false);
      setStatusMessage('Connection lost.');
    };
  };

  const navLinks = [
    { path: '/', label: 'Internships', icon: List },
    { path: '/companies', label: 'Companies', icon: Building2 },
    { path: '/presets', label: 'Presets', icon: Settings },
  ];

  return <header className="flex flex-col gap-6 bg-surface px-6 py-4 rounded-3xl mb-6">
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="p-3 bg-primary-container rounded-2xl text-on-primary-container">
            <Briefcase size={28} />
          </div>
          <h1 className="text-3xl font-bold text-on-surface">Internship Hunter</h1>
        </div>
        <p className="text-on-surface-variant ml-1">AI-powered internship finder</p>
      </div>
      <div className="flex gap-3 items-center">
        <ResumeUpload />
        <RunButton onRun={handleRun} isRunning={isRunning} />
      </div>
    </div>

    <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-outline/10 pt-4">
      <nav className="flex gap-2">
        {navLinks.map(link => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors font-medium ${isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
                }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      {statusMessage && (
        <div className="flex items-center gap-2 text-primary font-medium animate-pulse bg-primary-container/30 px-4 py-2 rounded-full text-sm">
          <Sparkles size={16} />
          <p>{statusMessage}</p>
        </div>
      )}
    </div>
  </header>
}

function App() {
  const { internships, fetchInternships } = useGlobalState();
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background text-on-background font-sans ">
        <div className="p-4 max-w-[1600px] mx-auto">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<InternshipList internships={internships} onUpdate={fetchInternships} />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/presets" element={<PresetsPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
