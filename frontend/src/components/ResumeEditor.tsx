
import { useState, useEffect, useRef } from 'react';
import { X, Download, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { generateResumeHtml, type ResumeData } from '../utils/resumeTemplate';

interface ResumeEditorProps {
    internshipId: string;
    company: string;
    title: string;
    onClose: () => void;
    onSave: (filePath: string) => void;
}

// Module-level cache to prevent double-fetching in StrictMode
// We store the PROMISE to handle in-flight deduplication
const requestCache = new Map<string, Promise<ResumeData>>();

export function ResumeEditor({ internshipId, company, title, onClose, onSave }: ResumeEditorProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [internshipId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            let dataPromise = requestCache.get(internshipId);

            if (!dataPromise) {
                // Create a new request and cache the promise immediately
                dataPromise = fetch(`http://localhost:3000/api/internships/${internshipId}/tailor-content`, {
                    method: 'POST'
                })
                    .then(async (res) => {
                        const data = await res.json();
                        if (!data.success || !data.data) {
                            throw new Error(data.error || 'Failed to load resume data');
                        }
                        return data.data as ResumeData;
                    })
                    .catch(err => {
                        // If failed, remove from cache so we can retry
                        requestCache.delete(internshipId);
                        throw err;
                    });

                requestCache.set(internshipId, dataPromise);
            }

            const data = await dataPromise;
            renderResume(data);

        } catch (err: any) {
            setError(err.message || 'Network error or server failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderResume = (data: ResumeData) => {
        const html = generateResumeHtml(data);
        if (iframeRef.current) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(html);
                doc.close();


                // Inject some editor-specific styles
                const style = doc.createElement('style');
                style.id = 'editor-styles'; // ID to identify and remove before saving
                style.textContent = `
                    html {
                        background-color: #525659; /* PDF Viewer Gray */
                        height: 100%;
                        overflow: auto;
                        display: flex;
                        justify-content: center;
                    }
                    body { 
                        width: 8.5in; /* US Letter Width */
                        min-height: 11in; /* US Letter Height */
                        margin: 20px auto; 
                        background: white; 
                        box-shadow: 0 0 10px rgba(0,0,0,0.5);
                        padding: 20px; /* Match template padding */
                        box-sizing: border-box;
                        outline: none;
                        max-width: none !important; /* Override template's max-width */
                        
                        /* Visual Page Breaks every 11 inches */
                        background-image: linear-gradient(to bottom, transparent calc(11in - 1px), red calc(11in - 1px), red 11in);
                        background-size: 100% 11in;
                        background-repeat: repeat-y;
                        position: relative;
                    }

                    /* Link Styles for Visibility and Editing */
                    a { 
                        cursor: pointer; 
                        border-bottom: 2px solid #0066cc; 
                        color: #0066cc;
                        text-decoration: none;
                        position: relative;
                        transition: all 0.2s;
                        padding-bottom: 2px;
                    }
                    a:hover { 
                        background: rgba(0, 102, 204, 0.1); 
                        border-bottom-style: solid;
                    }
                    a::after {
                        content: '✏️';
                        font-size: 10px;
                        margin-left: 4px;
                        vertical-align: super;
                        opacity: 0.7;
                    }

                    /* Hover/Focus visual cues for editing text */
                    *:hover { outline: 1px dashed #ccc; }
                    *:focus { outline: 2px solid #0066cc; background: rgba(0, 102, 204, 0.05); }
                `;
                doc.head.appendChild(style);

                // Inject script for handling link clicks
                const script = doc.createElement('script');
                script.id = 'editor-script'; // ID to identify and remove before saving
                script.textContent = `
                    document.body.addEventListener('click', (e) => {
                        const link = e.target.closest('a');
                        if (link) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const currentUrl = link.href;
                            const newUrl = prompt("Edit Link URL (Cancel to keep current):", currentUrl);
                            
                            if (newUrl !== null) {
                                link.href = newUrl;
                            }
                        }
                    }, true);
                `;
                doc.body.appendChild(script);

                // Setup contenteditable
                doc.body.contentEditable = "true";
            }
        }
    };

    const handleSave = async () => {
        if (!iframeRef.current?.contentDocument) return;

        setSaving(true);
        try {
            // Get the full HTML but remove editor artifacts
            const doc = iframeRef.current.contentDocument;
            const clone = doc.documentElement.cloneNode(true) as HTMLElement;

            // Remove editor styles and scripts
            const editorStyle = clone.querySelector('#editor-styles');
            if (editorStyle) editorStyle.remove();

            const editorScript = clone.querySelector('#editor-script');
            if (editorScript) editorScript.remove();

            // Remove contenteditable attribute and reset styles on body
            const body = clone.querySelector('body');
            if (body) {
                body.removeAttribute('contenteditable');
                // We need to clean up inline styles injected by our editor CSS if they persist (which they shouldn't as they are in the style tag we removed),
                // BUT wait, we modified the body styles via CSS, not inline style attribute (except maybe explicitly?).
                // Actually, the CSS rules were in the #editor-styles tag. Removing that tag removes the rules.
                // However, check if any attributes were set. 
                // The 'contenteditable' attribute is on the body tag itself. We removed it.
            }

            const html = "<!DOCTYPE html>\n" + clone.outerHTML;

            const res = await fetch('http://localhost:3000/api/generate-pdf-from-html', {

                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html,
                    company, // from props
                    title    // from props
                })
            });

            const data = await res.json();
            if (data.success) {
                onSave(data.filePath);
                onClose();
            } else {
                alert('Failed to save PDF: ' + data.error);
            }
        } catch (e) {
            console.error(e);
            alert('Failed to save PDF');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-outline/10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-outline/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                            <Save size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-on-surface">Resume Editor</h2>
                            <p className="text-sm text-on-surface-variant">Red lines indicate Page Breaks (Letter size).</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={loading || saving || !!error}
                            className="bg-primary text-on-primary px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                            Save & Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-surface-variant/20 overflow-hidden relative flex flex-col">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface/50 z-10">
                            <div className="flex flex-col items-center gap-3">
                                <RefreshCw size={32} className="animate-spin text-primary" />
                                <p className="font-medium text-on-surface-variant">Tailoring your resume with AI...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center p-8">
                            <div className="bg-error/10 text-error p-6 rounded-xl border border-error/20 max-w-md text-center">
                                <AlertCircle size={32} className="mx-auto mb-3" />
                                <p className="font-medium">{error}</p>
                                <button
                                    onClick={() => { requestCache.delete(internshipId); loadData(); }}
                                    className="mt-4 px-4 py-2 bg-surface text-on-surface rounded-lg text-sm border border-outline/10 hover:bg-surface-variant transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Full width container for the iframe canvas */}
                    <div className="flex-1 w-full bg-[#525659] overflow-hidden">
                        <iframe
                            ref={iframeRef}
                            title="Resume Preview"
                            className="w-full h-full border-none block"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
