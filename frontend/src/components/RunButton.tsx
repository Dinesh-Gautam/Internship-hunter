import { useState } from 'react';

interface RunButtonProps {
    onRunComplete: () => void;
}

export function RunButton({ onRunComplete }: RunButtonProps) {
    const [running, setRunning] = useState(false);

    const handleRun = async () => {
        setRunning(true);
        try {
            const res = await fetch('http://localhost:3000/api/run', { method: 'POST' });
            if (res.ok) {
                // Poll or wait? The backend returns immediately but runs in background.
                // For simplicity, we'll just wait a bit or let the user refresh manually, 
                // but ideally we'd use websockets or polling.
                // Given the backend logs "Run completed", we could poll /api/internships count?
                // For now, let's just show a "Started" state and revert after a few seconds.
                setTimeout(() => {
                    setRunning(false);
                    onRunComplete();
                }, 5000); // Fake wait for demo
            }
        } catch (error) {
            console.error('Run failed:', error);
            setRunning(false);
        }
    };

    return (
        <button
            onClick={handleRun}
            disabled={running}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition-all
                ${running
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-blue-500/30'
                }`}
        >
            {running ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Scraping...
                </span>
            ) : (
                'Find Internships'
            )}
        </button>
    );
}
