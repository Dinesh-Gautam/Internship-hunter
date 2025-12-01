import { useState } from 'react';
import Markdown from 'react-markdown';

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

interface InternshipCardProps {
    internship: Internship;
    onBlacklist: () => void;
}

export function InternshipCard({ internship, onBlacklist }: InternshipCardProps) {
    const [isBlacklisting, setIsBlacklisting] = useState(false);

    const handleBlacklist = async () => {
        if (!confirm(`Are you sure you want to blacklist ${internship.company}?`)) return;

        setIsBlacklisting(true);
        try {
            await fetch('http://localhost:3000/api/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company: internship.company }),
            });
            onBlacklist();
        } catch (error) {
            console.error('Failed to blacklist:', error);
        } finally {
            setIsBlacklisting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-gray-900">
                        <a href={internship.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                            {internship.title}
                        </a>
                    </h3>
                    <p className="text-gray-600 font-medium">{internship.company}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-2">
                        <span className="flex items-center gap-1">
                            📍 {internship.location}
                        </span>
                        <span className="flex items-center gap-1">
                            💰 {internship.stipend}
                        </span>
                        <span className="flex items-center gap-1">
                            ⏱️ {internship.duration}
                        </span>
                    </div>
                </div>
                <button
                    onClick={handleBlacklist}
                    disabled={isBlacklisting}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                    title="Blacklist Company"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="prose prose-sm max-w-none text-gray-600">
                    <p className="line-clamp-3">{internship.description}</p>
                </div>

                {internship.aiAnalysis && (
                    <div className="mt-4 bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                        <div className="font-semibold mb-1 flex items-center gap-2">
                            ✨ AI Analysis
                        </div>
                        {/* <p className="whitespace-pre-wrap">{internship.aiAnalysis}</p> */}
                        <p className='whitespace-pre-wrap'>
                            <Markdown >{internship.aiAnalysis}</Markdown>
                        </p>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {internship.skills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {skill}
                    </span>
                ))}
            </div>
        </div>
    );
}
