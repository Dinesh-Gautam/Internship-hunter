import { useState, useEffect } from 'react';
import { InternshipList } from './components/InternshipList';
import { RunButton } from './components/RunButton';

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
  seen?: boolean;
}

function App() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isRunning, setIsRunning] = useState(false);

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

  const handleRun = async () => {
    setIsRunning(true);
    setStatusMessage('Starting search...');

    const eventSource = new EventSource('http://localhost:3000/api/run');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'status') {
        setStatusMessage(data.message);
      } else if (data.type === 'internship') {
        setInternships(prev => [data.internship, ...prev]);
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Internship Hunter</h1>
            <p className="text-gray-500 mt-1">AI-powered internship finder</p>
            {statusMessage && (
              <p className="text-blue-600 font-medium mt-2 animate-pulse">{statusMessage}</p>
            )}
          </div>
          <RunButton onRun={handleRun} isRunning={isRunning} />
        </header>

        <main>
          <InternshipList internships={internships} onUpdate={fetchInternships} />
        </main>
      </div>
    </div>
  );
}

export default App;
