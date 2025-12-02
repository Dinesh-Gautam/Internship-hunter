import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    MapPin, DollarSign, Clock, Eye, EyeOff, Trash2, Ban, ExternalLink,
    Sparkles, FileText, CheckCircle, AlertCircle, Building2,
    Users, ChevronDown, ChevronUp
} from 'lucide-react';


export interface Internship {
    id: string;
    title: string;
    company: string;
    location: string;
    link: string;
    stipend: string;
    duration: string;
    source: string;
    description?: string;
    skills?: string[];
    ppo: string;
    matchAnalysis?: {
        score: number;
        verdict: string;
        summary: string;
        pros: string[];
        cons: string[];
    };
    seen: boolean;
    companyDetails?: {
        name: string;
        about: string;
        location: string;
        industry?: string;
        size?: string;
        websiteLink?: string;
        opportunitiesPosted?: string;
        candidatesHired?: string;
        hiringSince?: string;
    };
    companyAnalysis?: string;
}

interface InternshipCardProps {
    internship: Internship;
    onUpdate: () => void;
}

export function InternshipCard({ internship, onUpdate }: InternshipCardProps) {
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

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

    // Helper to get company website
    const getCompanyWebsite = () => {
        if (internship.companyDetails?.websiteLink) return internship.companyDetails.websiteLink;

        // Fallback to parsing analysis if needed (legacy support)
        if (internship.companyAnalysis) {
            const match = internship.companyAnalysis.match(/Website:\s*([^\s]+)/i);
            if (match && match[1] && !match[1].toLowerCase().includes('not found')) {
                let url = match[1];
                if (!url.startsWith('http')) url = 'https://' + url;
                return url;
            }
        }
        return null;
    };

    const companyUrl = getCompanyWebsite();
    const matchScore = internship.matchAnalysis?.score || 0;

    // Determine color based on match score
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-red-600 bg-red-100 border-red-200';
    };

    return (
        <div className={`rounded-3xl border transition-all duration-300 ${internship.seen ? 'opacity-80 bg-surface-variant/20 border-transparent' : 'bg-surface border-surface-variant'}`}>
            {/* Header Section */}
            <div className="p-6">
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl font-bold text-on-surface leading-tight">
                                <a href={internship.link} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline decoration-2 underline-offset-2 transition-colors">
                                    {internship.title}
                                </a>
                            </h3>
                            {!internship.seen && (
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-0.5 rounded-full border border-primary/20 animate-pulse">NEW</span>
                            )}
                            {internship.matchAnalysis && (
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getScoreColor(matchScore)}`}>
                                    {matchScore}% Match
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 text-on-surface-variant">
                            <Building2 size={16} />
                            <span className="font-medium">{internship.company}</span>
                            {companyUrl && (
                                <a href={companyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors p-1 hover:bg-primary/5 rounded-full">
                                    <ExternalLink size={14} />
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-1 shrink-0">
                        <button onClick={handleToggleSeen} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-colors" title={internship.seen ? "Mark as Unseen" : "Mark as Seen"}>
                            {internship.seen ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        <button onClick={handleBlacklist} disabled={loading} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors" title="Blacklist Company">
                            <Ban size={20} />
                        </button>
                        <button onClick={handleDelete} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors" title="Delete Internship">
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5 text-sm">
                    <div className="flex items-center gap-2 text-on-surface-variant bg-surface-variant/30 p-2 rounded-lg">
                        <MapPin size={16} className="text-primary" />
                        <span className="truncate" title={internship.location}>{internship.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant bg-surface-variant/30 p-2 rounded-lg">
                        <DollarSign size={16} className="text-primary" />
                        <span className="truncate" title={internship.stipend}>{internship.stipend}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant bg-surface-variant/30 p-2 rounded-lg">
                        <Clock size={16} className="text-primary" />
                        <span className="truncate" title={internship.duration}>{internship.duration}</span>
                    </div>
                    {internship.companyDetails?.size && (
                        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-variant/30 p-2 rounded-lg">
                            <Users size={16} className="text-primary" />
                            <span className="truncate" title="Company Size">{internship.companyDetails.size}</span>
                        </div>
                    )}
                </div>

                {/* Skills Tags */}
                {internship.skills && internship.skills.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {internship.skills.map((skill, i) => (
                            <span key={i} className="px-2.5 py-1 bg-surface-variant/50 text-on-surface-variant text-xs rounded-md font-medium border border-outline/10">
                                {skill}
                            </span>
                        ))}
                    </div>
                )}

                {/* PP Tag */}
                {internship.ppo && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="px-2.5 py-1 bg-primary text-on-primary text-xs rounded-md font-medium">
                            {internship.ppo}
                        </span>
                    </div>
                )}

            </div>

            {/* Expandable Content */}
            <div className="border-t border-outline/10 bg-surface-variant/5">
                <div className="flex">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex-1 p-3 text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                    >
                        {expanded ? (
                            <>
                                <ChevronUp size={16} /> Hide Details
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} /> Show Details
                            </>
                        )}
                    </button>
                    {(internship.matchAnalysis || internship.companyAnalysis) && (
                        <button
                            onClick={() => setShowAnalysis(!showAnalysis)}
                            className={`flex-1 p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-l border-outline/10 ${showAnalysis ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'}`}
                        >
                            <Sparkles size={16} /> AI Analysis
                        </button>
                    )}
                </div>

                {/* Description Section */}
                {expanded && internship.description && (
                    <div className="p-6 border-t border-outline/10 bg-surface">
                        <h4 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                            <FileText size={18} className="text-primary" /> Job Description
                        </h4>
                        <div className="prose prose-sm max-w-none text-on-surface-variant prose-headings:text-on-surface prose-a:text-primary prose-strong:text-on-surface">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.description}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* AI Analysis & Match Section */}
                {showAnalysis && (
                    <div className="p-6 border-t border-outline/10 bg-surface/50 space-y-6">
                        {internship.matchAnalysis && (
                            <div className="bg-tertiary-container/20 rounded-2xl p-5 border border-outline/30">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="font-semibold flex items-center gap-2 text-tertiary">
                                        <FileText size={18} /> Resume Match
                                    </div>
                                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${getScoreColor(matchScore)}`}>
                                        {internship.matchAnalysis.verdict}
                                    </span>
                                </div>

                                <p className="mb-4 text-on-surface-variant text-sm italic border-l-2 border-tertiary/30 pl-3">
                                    "{internship.matchAnalysis.summary}"
                                </p>

                                <div className="grid md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={14} /> Pros</h4>
                                        <ul className="space-y-1.5">
                                            {internship.matchAnalysis.pros.map((pro, i) => (
                                                <li key={i} className="flex items-start gap-2 text-on-surface-variant">
                                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 shrink-0"></span>
                                                    <ReactMarkdown>{pro}</ReactMarkdown>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1.5"><AlertCircle size={14} /> Cons</h4>
                                        <ul className="space-y-1.5">
                                            {internship.matchAnalysis.cons.map((con, i) => (
                                                <li key={i} className="flex items-start gap-2 text-on-surface-variant">
                                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 shrink-0"></span>
                                                    <ReactMarkdown>{con}</ReactMarkdown>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Company Details & Analysis */}
                        {(internship.companyDetails || internship.companyAnalysis) && (
                            <div className="bg-secondary-container/20 rounded-2xl p-5 border border-secondary-container/30">
                                <div className="font-semibold flex items-center gap-2 text-secondary mb-4">
                                    <Building2 size={18} /> Company Insights
                                </div>

                                {internship.companyDetails && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 text-sm">
                                        {internship.companyDetails.industry && (
                                            <div className="bg-surface p-2 rounded border border-outline/10">
                                                <span className="block text-xs text-on-surface-variant/70">Industry</span>
                                                <span className="font-medium text-on-surface">{internship.companyDetails.industry}</span>
                                            </div>
                                        )}
                                        {internship.companyDetails.hiringSince && (
                                            <div className="bg-surface p-2 rounded border border-outline/10">
                                                <span className="block text-xs text-on-surface-variant/70">Hiring Since</span>
                                                <span className="font-medium text-on-surface">{internship.companyDetails.hiringSince}</span>
                                            </div>
                                        )}
                                        {internship.companyDetails.opportunitiesPosted && (
                                            <div className="bg-surface p-2 rounded border border-outline/10">
                                                <span className="block text-xs text-on-surface-variant/70">Posted</span>
                                                <span className="font-medium text-on-surface">{internship.companyDetails.opportunitiesPosted}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {internship.companyAnalysis && (
                                    <div className="prose prose-sm prose-p:text-on-surface-variant prose-headings:text-on-surface max-w-none bg-surface/50 p-4 rounded-xl border border-outline/10">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.companyAnalysis}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}
