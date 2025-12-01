import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

interface InternshipCardProps {
    internship: Internship;
    onUpdate: () => void;
}

export function InternshipCard({ internship, onUpdate }: InternshipCardProps) {
    const [loading, setLoading] = useState(false);

    const handleBlacklist = async () => {
        if (!confirm(`Are you sure you want to blacklist ${internship.company}?`)) return;
        setLoading(true);
        try {
            await fetch('http://localhost:3000/api/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company: internship.company }),
            });
            onUpdate();
        } catch (error) {
            console.error('Failed to blacklist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSeen = async () => {
        try {
            await fetch(`http://localhost:3000/api/internships/${internship.id}/seen`, { method: 'POST' });
            onUpdate();
        } catch (error) {
            console.error('Failed to toggle seen:', error);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Delete this internship?')) return;
        try {
            await fetch(`http://localhost:3000/api/internships/${internship.id}`, { method: 'DELETE' });
            onUpdate();
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    return (
        <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all p-6 ${internship.seen ? 'opacity-75 bg-gray-50' : 'border-blue-100 ring-1 ring-blue-50'}`}>
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                            <a href={internship.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline decoration-2 underline-offset-2">
                                {internship.title}
                            </a>
                        </h3>
                        {!internship.seen && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">NEW</span>
                        )}
                    </div>
                    <p className="text-gray-600 font-medium">{internship.company}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-2">
                        <span className="flex items-center gap-1">📍 {internship.location}</span>
                        <span className="flex items-center gap-1">💰 {internship.stipend}</span>
                        <span className="flex items-center gap-1">⏱️ {internship.duration}</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handleToggleSeen} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full" title={internship.seen ? "Mark as Unseen" : "Mark as Seen"}>
                        {internship.seen ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                    </button>
                    <button onClick={handleBlacklist} disabled={loading} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Blacklist Company">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </button>
                    <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full" title="Delete Internship">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="prose prose-sm max-w-none text-gray-600">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.description}</ReactMarkdown>
                </div>

                {internship.aiAnalysis && (
                    <div className="mt-4 bg-blue-50 rounded-lg p-4 text-sm text-blue-800 border border-blue-100">
                        <div className="font-semibold mb-2 flex items-center gap-2">✨ AI Analysis</div>
                        <div className="prose prose-sm prose-blue max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.aiAnalysis}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {internship.skills.map((skill, i) => (
                    <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium border border-gray-200">
                        {skill}
                    </span>
                ))}
            </div>
        </div>
    );
}
