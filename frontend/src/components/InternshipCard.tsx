import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MapPin, DollarSign, Clock, Eye, EyeOff, Trash2, Ban, ExternalLink, Sparkles } from 'lucide-react';

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
    companyWebsite?: string;
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

    // Extract website from AI analysis if not provided directly
    const getCompanyWebsite = () => {
        if (internship.companyWebsite) return internship.companyWebsite;

        if (internship.aiAnalysis) {
            const match = internship.aiAnalysis.match(/Website:\s*([^\s]+)/i);
            if (match && match[1] && !match[1].toLowerCase().includes('not found')) {
                let url = match[1];
                if (!url.startsWith('http')) {
                    url = 'https://' + url;
                }
                return url;
            }
        }
        return null;
    };

    const companyUrl = getCompanyWebsite();

    return (
        <div className={`rounded-3xl border transition-all p-6 ${internship.seen ? 'opacity-75 bg-surface-variant/30 border-transparent' : 'bg-surface border-surface-variant/50 shadow-sm hover:shadow-md'}`}>
            <div className="flex justify-between items-start gap-4">
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-on-surface">
                            <a href={internship.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline decoration-2 underline-offset-2">
                                {internship.title}
                            </a>
                        </h3>
                        {!internship.seen && (
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-full border border-primary/20">NEW</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <p className="text-on-surface-variant font-medium">{internship.company}</p>
                        {companyUrl && (
                            <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors" title="Visit Company Website">
                                <ExternalLink size={16} />
                            </a>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant mt-3">
                        <span className="flex items-center gap-1.5"><MapPin size={16} /> {internship.location}</span>
                        <span className="flex items-center gap-1.5"><DollarSign size={16} /> {internship.stipend}</span>
                        <span className="flex items-center gap-1.5"><Clock size={16} /> {internship.duration}</span>
                    </div>
                </div>

                <div className="flex gap-1">
                    <button onClick={handleToggleSeen} className="p-2.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title={internship.seen ? "Mark as Unseen" : "Mark as Seen"}>
                        {internship.seen ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    <button onClick={handleBlacklist} disabled={loading} className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors" title="Blacklist Company">
                        <Ban size={20} />
                    </button>
                    <button onClick={handleDelete} className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors" title="Delete Internship">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            <div className="mt-5 pt-5 border-t border-outline/20">
                <div className="prose prose-sm max-w-none text-on-surface-variant prose-headings:text-on-surface prose-a:text-primary">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.description}</ReactMarkdown>
                </div>

                {internship.aiAnalysis && (
                    <div className="mt-5 bg-secondary-container/30 rounded-2xl p-5 text-sm text-on-secondary-container border border-secondary-container/50">
                        <div className="font-semibold mb-2 flex items-center gap-2 text-primary">
                            <Sparkles size={16} /> AI Analysis
                        </div>
                        <div className="prose prose-sm prose-p:text-on-secondary-container max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.aiAnalysis}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {internship.skills.map((skill, i) => (
                    <span key={i} className="px-3 py-1 bg-surface-variant text-on-surface-variant text-xs rounded-lg font-medium border border-outline/20">
                        {skill}
                    </span>
                ))}
            </div>
        </div>
    );
}
