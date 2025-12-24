import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    MapPin, DollarSign, Clock, Eye, EyeOff, Trash2, Ban, ExternalLink,
    Sparkles, FileText, Building2,
    Users, ChevronDown, ChevronUp,
    Calendar, RefreshCw
} from 'lucide-react';
import { useGlobalState } from '../store/global';


import { ResumeEditor } from './ResumeEditor';

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
    postedOn: string;
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
    isSelected?: boolean;
    onSelect?: () => void;
}

export function InternshipCard({ internship, onUpdate, isSelected, onSelect }: InternshipCardProps) {
    const [loading, setLoading] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const { setInternships } = useGlobalState();

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
            setInternships(prev => prev.map(i => i.id === internship.id ? { ...i, seen: !i.seen } : i));
            setExpanded(false);
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

    const handleRetryAi = async () => {
        setRetrying(true);
        try {
            const res = await fetch(`http://localhost:3000/api/internships/${internship.id}/retry-ai`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                onUpdate();
            }
        } catch (error) {
            console.error('Retry failed', error);
        } finally {
            setRetrying(false);
        }
    };

    // Helper to get company website
    const getCompanyWebsite = () => {
        if (internship.companyDetails?.websiteLink) return internship.companyDetails.websiteLink;
    };

    const companyUrl = getCompanyWebsite();
    const matchScore = internship.matchAnalysis?.score || 0;

    const hasAiError = !internship.matchAnalysis || !internship.companyAnalysis ||
        internship.companyAnalysis?.includes('AI analysis failed') ||
        internship.companyAnalysis?.includes('Analysis skipped');

    // Determine color based on match score
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-red-600 bg-red-100 border-red-200';
    };

    return (
        <div className={`rounded-3xl border transition-all duration-300 ${internship.seen ? 'opacity-80 bg-surface-variant/20 border-transparent' :
            isSelected ? 'bg-surface border-primary ring-1 ring-primary shadow-md' : 'bg-surface border-surface-variant'
            }`}>
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
                            {hasAiError && (
                                <button
                                    onClick={handleRetryAi}
                                    disabled={retrying}
                                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border border-error/30 bg-error/10 text-error hover:bg-error/20 transition-colors"
                                >
                                    <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
                                    {retrying ? 'Retrying...' : 'Retry AI'}
                                </button>
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
                    {internship.postedOn && (
                        <div className="flex items-center gap-2 text-on-surface-variant bg-surface-variant/30 p-2 rounded-lg">
                            <Calendar size={16} className="text-primary" />
                            <span className="truncate" title="Company Size">{internship.postedOn}</span>
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
                            onClick={onSelect}
                            className={`flex-1 p-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 border-l border-outline/10 ${isSelected ? 'text-primary bg-primary/5' : 'text-on-surface-variant hover:text-primary hover:bg-primary/5'}`}
                        >
                            <Sparkles size={16} /> {isSelected ? 'Viewing Analysis' : 'View Analysis'}
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


                        {/* Tailor Resume Section */}
                        <div className="mt-8 pt-6 border-t border-outline/10">
                            <TailorResumeSection
                                internshipId={internship.id}
                                company={internship.company}
                                title={internship.title}
                            />
                        </div>

                    </div>
                )}

            </div>
        </div>
    );
}


function TailorResumeSection({ internshipId, company, title }: { internshipId: string, company: string, title: string }) {
    const [showEditor, setShowEditor] = useState(false);
    const [tailoredFile, setTailoredFile] = useState<string | null>(null);

    const handleOpenFile = async () => {
        if (!tailoredFile) return;
        try {
            await fetch('http://localhost:3000/api/open-file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: tailoredFile })
            });
        } catch (e) {
            console.error(e);
        }
    };

    const handleShowInFolder = async () => {
        if (!tailoredFile) return;
        try {
            await fetch('http://localhost:3000/api/show-in-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: tailoredFile })
            });
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="bg-surface-variant/20 rounded-xl p-4 border border-outline/10">
            <h4 className="font-semibold text-on-surface mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-secondary" /> Resume Tailoring
            </h4>

            {!tailoredFile ? (
                <div className="flex items-center gap-3">
                    <p className="text-sm text-on-surface-variant flex-1">
                        Generate a PDF resume tailored specifically for this internship using AI. You can edit the content before downloading.
                    </p>
                    <button
                        onClick={() => setShowEditor(true)}
                        className="px-4 py-2 bg-secondary text-on-secondary rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors flex items-center gap-2"
                    >
                        <FileText size={16} /> Open Editor
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 text-sm font-medium">
                        <Sparkles size={14} /> Resume Generated & Saved!
                    </div>
                    <div className="flex gap-2 ml-auto">
                        <button
                            onClick={handleOpenFile}
                            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2"
                        >
                            <ExternalLink size={14} /> Open PDF
                        </button>
                        <button
                            onClick={handleShowInFolder}
                            className="px-3 py-1.5 bg-surface-variant text-on-surface-variant rounded-lg text-sm font-medium hover:bg-surface-variant/80 transition-colors flex items-center gap-2"
                        >
                            <FileText size={14} /> Show in Folder
                        </button>
                        <button
                            onClick={() => setTailoredFile(null)}
                            className="px-3 py-1.5 text-on-surface-variant/50 hover:text-on-surface-variant hover:bg-surface-variant/50 rounded-lg text-sm transition-colors"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setShowEditor(true)}
                            className="px-3 py-1.5 text-secondary hover:underline text-sm transition-colors"
                        >
                            Edit Again
                        </button>
                    </div>
                </div>
            )}

            {showEditor && (
                <ResumeEditor
                    internshipId={internshipId}
                    company={company}
                    title={title}
                    onClose={() => setShowEditor(false)}
                    onSave={(path) => setTailoredFile(path)}
                />
            )}
        </div>
    );
}

