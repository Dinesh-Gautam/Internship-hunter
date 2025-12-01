import { useState, useEffect } from 'react';
import { RunButton } from './components/RunButton';
import { InternshipList } from './components/InternshipList';

interface Internship {
  id: string;
  title: string;
  company: string;
  location: string;
  link: string;
  stipend: string;
  duration: string;
  source: string;
  description: string;
  skills: string[];
  aiAnalysis?: string;
}

function App() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInternships = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/internships');
      const data = await res.json();
      setInternships(data);
    } catch (error) {
      console.error('Failed to fetch internships:', error);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Internship Hunter</h1>
            <p className="text-gray-500 mt-1">AI-powered internship finder</p>
          </div>
          <RunButton onRunComplete={fetchInternships} />
        </header>

        <main>
          <InternshipList internships={internships} onBlacklist={fetchInternships} />
        </main>
      </div>
    </div>
  );
}

export default App;
