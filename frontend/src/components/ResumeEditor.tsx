
import { useState, useEffect, useRef } from 'react';
import { X, Download, Save, RefreshCw, AlertCircle, Type, FileCode } from 'lucide-react';
import { generateResumeHtml, type ResumeData, RESUME_FONTS } from '../utils/resumeTemplate';

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
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);
    const [selectedFontId, setSelectedFontId] = useState<string>(RESUME_FONTS[0].id);
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [htmlSource, setHtmlSource] = useState('');

    const [saving, setSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isUpdatingFromIframe = useRef(false);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [internshipId]);

    useEffect(() => {
        if (resumeData) {
            // When data or font changes, we reset the source from the template
            // Note: This overwrites custom changes if the user switches fonts. 
            // This is expected behavior for "applying a template/theme".
            const newHtml = generateResumeHtml(resumeData, selectedFontId);
            setHtmlSource(newHtml);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFontId, resumeData]);

    // Handle messages from iframe
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'RESUME_CONTENT_CHANGE') {
                isUpdatingFromIframe.current = true;
                const visualHtml = getCleanHtmlFromIframe();
                if (visualHtml) {
                    setHtmlSource(visualHtml);
                }

                // Reset flag after a short delay to allow React state to settle without triggering the update effect immediately
                setTimeout(() => {
                    isUpdatingFromIframe.current = false;
                }, 100);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Sync htmlSource changes to the iframe
    useEffect(() => {
        if (htmlSource && !isUpdatingFromIframe.current) {
            updateIframe(htmlSource);
        }
    }, [htmlSource]);

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
            setResumeData(data);
            // Effect will trigger setHtmlSource -> updateIframe

        } catch (err: any) {
            setError(err.message || 'Network error or server failed');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Updates the iframe with the provided HTML string.
     * Also injects the editor scripts/styles if we are NOT in code editing mode (or even if we are, for consistency, 
     * but maybe we want to disable contentEditable when in code mode to avoid confusion).
     */
    const updateIframe = (html: string) => {
        if (!iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc) return;

        try {
            doc.open();
            doc.write(html);
            doc.close();

            // Inject tools
            injectEditorTools(doc);
        } catch (e) {
            console.error("Failed to render iframe", e);
        }
    };

    const injectEditorTools = (doc: Document) => {
        // Inject some editor-specific styles
        const style = doc.createElement('style');
        style.id = 'editor-styles';
        style.textContent = `
            html {
                background-color: #525659;
                height: 100%;
                overflow: auto;
                display: flex;
                justify-content: center;
            }
            body { 
                width: 8.5in;
                min-height: 11in;
                margin: 20px auto; 
                background: white; 
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                padding: 20px;
                box-sizing: border-box;
                outline: none;
                max-width: none !important;
                
                /* Visual Page Breaks */
                background-image: linear-gradient(to bottom, transparent calc(11in - 1px), red calc(11in - 1px), red 11in);
                background-size: 100% 11in;
                background-repeat: repeat-y;
                position: relative;
            }

            /* Link Styles */
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

            /* Hover/Focus visual cues */
            *:hover { outline: 1px dashed #ccc; }
            *:focus { outline: 2px solid #0066cc; background: rgba(0, 102, 204, 0.05); }
        `;
        doc.head.appendChild(style);

        // Inject script for handling link clicks
        const script = doc.createElement('script');
        script.id = 'editor-script';
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
                        // Dispatch input event to trigger sync
                         document.body.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }, true);
            
            // Sync changes back to React
            const notifyChange = () => {
                 window.parent.postMessage({ type: 'RESUME_CONTENT_CHANGE' }, '*');
            };

            document.body.addEventListener('input', notifyChange);
            document.body.addEventListener('keyup', notifyChange);
        `;
        doc.body.appendChild(script);

        // Setup contenteditable
        // We only enable contenteditable if the code editor is NOT open (or we can leave it, but changes will be overwritten by the next code edit)
        // Ideally, we keep it enabled so the user can click around, but we should know that 'htmlSource' is the master.
        // If the user edits in WYSIWYG, they must sync before opening Code Editor to save those changes.
        doc.body.contentEditable = "true";
    };

    /**
     * Extracts the clean HTML (without editor artifacts) from the current iframe state.
     */
    const getCleanHtmlFromIframe = (): string | null => {
        if (!iframeRef.current?.contentDocument) return null;

        const doc = iframeRef.current.contentDocument;
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;

        // Remove editor styles and scripts
        const editorStyle = clone.querySelector('#editor-styles');
        if (editorStyle) editorStyle.remove();

        const editorScript = clone.querySelector('#editor-script');
        if (editorScript) editorScript.remove();

        // Remove contenteditable attribute
        const body = clone.querySelector('body');
        if (body) {
            body.removeAttribute('contenteditable');
        }

        return "<!DOCTYPE html>\n" + clone.outerHTML;
    };

    const toggleCodeEditor = () => {
        if (!showCodeEditor) {
            // Opening Code Editor: Sync current WYSIWYG state to htmlSource
            const currentVisual = getCleanHtmlFromIframe();
            if (currentVisual) {
                setHtmlSource(currentVisual);
            }
        }
        setShowCodeEditor(!showCodeEditor);
    };

    // Note: We removed the old renderResume function as logic is now in useEffect + updateIframe

    const handleSave = async () => {
        setSaving(true);
        try {
            // If code editor is open, htmlSource is the most up to date.
            // If code editor is closed, the iframe DOM might have newer changes from WYSIWYG edits.
            let htmlToSave = showCodeEditor ? htmlSource : getCleanHtmlFromIframe();

            if (!htmlToSave) {
                // Fallback
                htmlToSave = htmlSource;
            }

            const res = await fetch('http://localhost:3000/api/generate-pdf-from-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: htmlToSave,
                    company,
                    title
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
                            onClick={toggleCodeEditor}
                            className={`p-2 rounded-lg transition-colors ${showCodeEditor ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
                            title="Edit HTML/CSS"
                        >
                            <FileCode size={20} />
                        </button>

                        <div className="flex items-center gap-2 mr-4 bg-surface-variant/30 p-1 rounded-lg">
                            <Type size={16} className="ml-2 text-on-surface-variant" />
                            <select
                                value={selectedFontId}
                                onChange={(e) => setSelectedFontId(e.target.value)}
                                className="bg-transparent border-none text-sm text-on-surface focus:ring-0 cursor-pointer py-1 pr-8 pl-2 outline-none"
                            >
                                {RESUME_FONTS.map(font => (
                                    <option key={font.id} value={font.id}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                    <div className="flex-1 w-full bg-[#525659] overflow-hidden flex flex-row">
                        <iframe
                            ref={iframeRef}
                            title="Resume Preview"
                            className={`h-full border-none block ${showCodeEditor ? 'w-1/2' : 'w-full'}`}
                        />

                        {showCodeEditor && (
                            <div className="w-1/2 h-full border-l border-outline/10 bg-[#1e1e1e] flex flex-col">
                                <div className="p-2 bg-[#2d2d2d] text-gray-400 text-xs flex justify-between items-center">
                                    <span>HTML & CSS Source</span>
                                    <button onClick={() => updateIframe(htmlSource)} className="hover:text-white"><RefreshCw size={12} /></button>
                                </div>
                                <textarea
                                    value={htmlSource}
                                    onChange={(e) => setHtmlSource(e.target.value)}
                                    className="flex-1 w-full bg-[#1e1e1e] text-gray-300 font-mono text-sm p-4 resize-none outline-none border-none"
                                    spellCheck={false}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
