
import { useState, useEffect, useRef } from 'react';
import { X, Download, Save, RefreshCw, Type, FileCode, User as UserIcon } from 'lucide-react';
import Editor, { type OnMount } from "@monaco-editor/react";
import { generateResumeHtml, type ResumeData, RESUME_FONTS } from '../utils/resumeTemplate';
import { ProfileSettings } from './ProfileSettings';

interface ResumeEditorProps {
    internshipId: string;
    company: string;
    title: string;
    onClose: () => void;
    onSave: (filePath: string) => void;
}

// Module-level cache to prevent double-fetching in StrictMode
const requestCache = new Map<string, Promise<{ data: ResumeData, html?: string }>>();

export function ResumeEditor({ internshipId, company, title, onClose, onSave }: ResumeEditorProps) {
    const [loading, setLoading] = useState(true);
    // const [error, setError] = useState<string | null>(null); // Removed unused error state
    const [resumeData, setResumeData] = useState<ResumeData | null>(null);
    const [selectedFontId, setSelectedFontId] = useState<string>(RESUME_FONTS[0].id);
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [htmlSource, setHtmlSource] = useState('');
    const [showProfile, setShowProfile] = useState(false);

    const [editingLink, setEditingLink] = useState<{ url: string, x: number, y: number } | null>(null);
    const [linkInput, setLinkInput] = useState('');

    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const [saving, setSaving] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const isUpdatingFromIframe = useRef(false);
    const editorRef = useRef<any>(null);
    const iframeClickHandlerRef = useRef<any>(null);
    const iframeInputHandlerRef = useRef<any>(null);
    const iframeDebounceTimerRef = useRef<any>(null);

    useEffect(() => {
        loadData();
    }, [internshipId]);

    // Apply font changes - ONLY if we haven't loaded a saved custom HTML or if we decide to
    // For now, if user explicitly changes font, we regenerate.
    // To avoid losing edits, we could just swap the CSS variable in the HTML string, but that's regex-heavy.
    // Simple approach: Regeneration warns user? Or we just regenerate if no saved HTML was loaded.
    // If saved HTML WAS loaded, we probably shouldn't regenerate on mount, but if user CLICKs font dropdown, we DO regenerate.
    // We track if "initial load" happened.
    const [initialLoadDone, setInitialLoadDone] = useState(false);

    useEffect(() => {
        if (resumeData && initialLoadDone) {
            // Only regenerate if user *changes* font after initial load.
            // But valid use case: user loads saved HTML, then wants to change font. 
            // We can regex replace the font-family.
            const font = RESUME_FONTS.find(f => f.id === selectedFontId);
            if (font && htmlSource) {
                // Try to swap font in existing HTML
                const newCssUrl = font.googleFontUrl;

                let newHtml = htmlSource;
                // Replace Google Font Import
                newHtml = newHtml.replace(/href="https:\/\/fonts\.googleapis\.com\/css2\?family=[^&]+&display=swap"/, `href="${newCssUrl}"`);

                // Replace CSS Variable
                newHtml = newHtml.replace(/--font-body: [^;]+;/g, `--font-body: ${font.bodyFamily};`);
                newHtml = newHtml.replace(/--font-heading: [^;]+;/g, `--font-heading: ${font.headingFamily};`);

                setHtmlSource(newHtml);
            } else if (resumeData) {
                // Fallback to regen if no source yet
                setHtmlSource(generateResumeHtml(resumeData, selectedFontId));
            }
        }
    }, [selectedFontId]); // Remove resumeData dependency to avoid loops

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'RESUME_CONTENT_CHANGE') {
                isUpdatingFromIframe.current = true;
                const visualHtml = getCleanHtmlFromIframe();
                if (visualHtml) {
                    setHtmlSource(visualHtml);
                }
                setTimeout(() => { isUpdatingFromIframe.current = false; }, 100);
            } else if (event.data?.type === 'EDIT_LINK') {
                setEditingLink({
                    url: event.data.url,
                    x: event.data.x,
                    y: event.data.y
                });
                setLinkInput(event.data.url);
            } else if (event.data?.type === 'ELEMENT_CLICKED') {
                // Highlight in Editor
                if (editorRef.current && showCodeEditor) {
                    const text = event.data.text;
                    if (text && text.length > 5) {
                        const model = editorRef.current.getModel();
                        const matches = model.findMatches(text, false, false, true, null, true);
                        if (matches.length > 0) {
                            editorRef.current.setSelection(matches[0].range);
                            editorRef.current.revealRangeInCenter(matches[0].range);
                        }
                    }
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [showCodeEditor]);

    useEffect(() => {
        if (htmlSource && !isUpdatingFromIframe.current) {
            updateIframe(htmlSource);
        }
    }, [htmlSource]);

    const loadData = async () => {
        setLoading(true);
        setMessage(null);
        try {
            let dataPromise = requestCache.get(internshipId);
            if (!dataPromise) {
                dataPromise = fetch(`http://localhost:3000/api/internships/${internshipId}/tailor-content`, { method: 'POST' })
                    .then(async res => {
                        const data = await res.json();
                        if (!data.success) throw new Error(data.error || 'Failed to load');
                        return data;
                    })
                    .catch(err => {
                        requestCache.delete(internshipId);
                        throw err;
                    });
                requestCache.set(internshipId, dataPromise);
            }

            const res = await dataPromise;
            setResumeData(res.data);

            if (res.html) {
                setHtmlSource(res.html);
            } else {
                setHtmlSource(generateResumeHtml(res.data, selectedFontId));
            }
            setInitialLoadDone(true);

        } catch (err: any) {
            setMessage({ text: err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const updateIframe = (html: string) => {
        if (!iframeRef.current) return;
        const doc = iframeRef.current.contentDocument;
        if (!doc) return;
        try {
            doc.open();
            doc.write(html);
            doc.close();
            injectEditorTools(doc);
        } catch (e) {
            console.error("Failed to render iframe", e);
        }
    };

    const injectEditorTools = (doc: Document) => {
        const style = doc.createElement('style');
        style.id = 'editor-styles';
        style.textContent = `
            html { background-color: #525659; height: 100%; overflow: auto; display: flex; justify-content: center; }
            body { width: 8.5in; min-height: 11in; margin: 20px auto; background: white; padding: 20px; box-sizing: border-box; outline: none; position: relative; }
            a { cursor: pointer; border-bottom: 2px solid #0066cc; color: #0066cc; text-decoration: none; position: relative; }
            a:hover { background: rgba(0, 102, 204, 0.1); }
            *:hover { outline: 1px dashed #ccc; }
            *:focus { outline: 2px solid #0066cc; background: rgba(0, 102, 204, 0.05); }
        `;
        doc.head.appendChild(style);

        // Clean up previous listeners if they exist
        if (iframeClickHandlerRef.current) {
            doc.body.removeEventListener('click', iframeClickHandlerRef.current, true);
        }
        if (iframeInputHandlerRef.current) {
            doc.body.removeEventListener('input', iframeInputHandlerRef.current);
        }
        if (iframeDebounceTimerRef.current) {
            clearTimeout(iframeDebounceTimerRef.current);
        }

        // Add listeners directly from parent context
        const clickHandler = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link) {
                e.preventDefault();
                e.stopPropagation();

                const rect = link.getBoundingClientRect();
                // Since rect is relative to iframe viewport, we don't need to adjust for iframe position if we position modal absolutely inside the container which wraps the iframe?
                // Actually the current modal is absolutely positioned inside the relative container holding the iframe.
                // But postMessage was passing generic props. We can simpler update state directly since we are in React!

                // Oh wait, rect is relative to iframe viewport. We need to respect that.
                // Or I can trigger the state update directly here instead of postMessage!
                // But sticking to the pattern for now, or simplifying?
                // Let's simplify and call setEditingLink directly.

                setEditingLink({
                    url: (link as HTMLAnchorElement).href,
                    x: rect.left,
                    y: rect.top + rect.height
                });
                setLinkInput((link as HTMLAnchorElement).href);

                return false;
            } else {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (target && target.textContent) {
                        // Dispatch custom event or just postMessage to self if we want to keep consistent?
                        // Or just handle logic here. handleEditorDidMount ref is available.
                        // Let's use the existing postMessage pattern just to be consistent with the effect hook, 
                        // OR we can just emit the message to window to let the existing listener catch it?
                        // Actually, since we are in the same scope, we can't emit to window.parent easily if we are the parent. 
                        // We should just call the logic directly. But the logic is in an effect.
                        // Let's just emit an event on window that our effect listens to? 
                        // Or better, just dispatch the action.

                        // Simplest: `window.postMessage` to self.
                        window.postMessage({
                            type: 'ELEMENT_CLICKED',
                            text: target.textContent.substring(0, 50)
                        }, '*');
                    }
                }
            }
        };
        doc.body.addEventListener('click', clickHandler, true);
        iframeClickHandlerRef.current = clickHandler; // Store for cleanup

        const notifyChange = () => {
            clearTimeout(iframeDebounceTimerRef.current);
            iframeDebounceTimerRef.current = setTimeout(() => {
                // window.parent.postMessage ... 
                // Again, we are in the parent. Just set state?
                // But we have isUpdatingFromIframe logic.
                // Let's trigger the message handler via dispatch?
                window.postMessage({ type: 'RESUME_CONTENT_CHANGE' }, '*');
            }, 1000);
        };
        doc.body.addEventListener('input', notifyChange);
        iframeInputHandlerRef.current = notifyChange; // Store for cleanup

        doc.body.contentEditable = "true";
    };

    const getCleanHtmlFromIframe = (): string | null => {
        if (!iframeRef.current?.contentDocument) return null;
        const doc = iframeRef.current.contentDocument;
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;
        const editorStyle = clone.querySelector('#editor-styles');
        if (editorStyle) editorStyle.remove();
        // Script tags inside body are usually transient but let's be safe
        const scripts = clone.querySelectorAll('script');
        scripts.forEach(s => s.remove());
        const body = clone.querySelector('body');
        if (body) body.removeAttribute('contenteditable');
        return "<!DOCTYPE html>\n" + clone.outerHTML;
    };

    const handleEditorDidMount: OnMount = (editor) => {
        editorRef.current = editor;
    };

    const handleUpdateLink = () => {
        if (!iframeRef.current?.contentDocument) return;
        // Easier to just update HTML source via Regex safely, OR ask iframe to update itself?
        // Updating source rerenders everything which is safe but flashes.
        // Let's try to update iframe DOM directly then trigger sync.
        const doc = iframeRef.current.contentDocument;
        const links = doc.getElementsByTagName('a');
        // Find the link that matches the old URL. Simple heuristic.
        for (let i = 0; i < links.length; i++) {
            if (links[i].href === editingLink?.url) {
                links[i].href = linkInput;
                // Only update href, not text content
                break;
            }
        }
        // Sync
        const html = getCleanHtmlFromIframe();
        if (html) setHtmlSource(html);
        setEditingLink(null);
    };

    const saveResumeState = async (htmlToSave: string) => {
        // Save current HTML to backend
        await fetch(`http://localhost:3000/api/internships/${internshipId}/save-resume`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html: htmlToSave,
                data: resumeData
            })
        });
    }

    const handleSave = async () => {
        setSaving(true);
        try {
            let htmlToSave = showCodeEditor ? htmlSource : (getCleanHtmlFromIframe() || htmlSource);

            // 1. Force update link styling if legacy style is present
            // (Fixes issue where old saved resumes have black links)
            htmlToSave = htmlToSave.replace(
                /a\s*{\s*color:\s*#000;\s*text-decoration:\s*none;\s*}/g,
                'a { color: #0066cc; text-decoration: underline; }'
            );

            // 2. Save state
            await saveResumeState(htmlToSave);

            // 3. Generate PDF
            const res = await fetch('http://localhost:3000/api/generate-pdf-from-html', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html: htmlToSave, company, title })
            });

            const data = await res.json();
            if (data.success) {
                onSave(data.filePath);
                // Clear cache so if we reopen, we fetch the updated (saved) content
                requestCache.delete(internshipId);
                setMessage({ text: 'Saved & Downloaded!', type: 'success' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                throw new Error(data.error);
            }
        } catch (e: any) {
            setMessage({ text: 'Failed to save: ' + e.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col border border-outline/10">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-outline/10 bg-surface rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary-container rounded-lg text-on-secondary-container">
                            <Save size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-on-surface">Resume Editor</h2>
                            <p className="text-sm text-on-surface-variant flex items-center gap-2">
                                {company} - {title}
                            </p>
                        </div>
                        {message && (
                            <div className={`px-3 py-1 rounded text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {message.text}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowProfile(true)}
                            className="p-2 mr-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-full transition-colors"
                            title="Profile Settings"
                        >
                            <UserIcon size={20} />
                        </button>

                        <button
                            onClick={() => setShowCodeEditor(!showCodeEditor)}
                            className={`p-2 rounded-lg transition-colors ${showCodeEditor ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:bg-surface-variant/50'}`}
                            title="Toggle Code Editor (Ctrl+Click in preview to locate code)"
                        >
                            <FileCode size={20} />
                        </button>

                        <div className="flex items-center gap-2 bg-surface-variant/30 px-2 py-1 rounded-lg border border-outline/10">
                            <Type size={16} className="text-on-surface-variant" />
                            <select
                                value={selectedFontId}
                                onChange={(e) => setSelectedFontId(e.target.value)}
                                className="bg-transparent border-none text-sm text-on-surface focus:ring-0 cursor-pointer outline-none w-32"
                            >
                                {RESUME_FONTS.map(font => <option key={font.id} value={font.id}>{font.label}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={loading || saving}
                            className="bg-primary text-on-primary px-4 py-2 rounded-full font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                            Save & PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-full">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 bg-surface-variant/20 overflow-hidden relative flex flex-row">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-20">
                            <RefreshCw size={32} className="animate-spin text-primary" />
                        </div>
                    )}

                    {/* Iframe Preview */}
                    <div className={`transition-all duration-300 ${showCodeEditor ? 'w-1/2' : 'w-full'} bg-[#525659] relative`}>
                        <iframe ref={iframeRef} className="w-full h-full border-none block" title="Preview" />

                        {/* Link Edit Modal (in-place) */}
                        {editingLink && (
                            <div className="absolute z-30 p-4 bg-white rounded-lg shadow-xl border border-gray-200 w-80 animate-in fade-in zoom-in duration-200"
                                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                                <h3 className="text-sm font-bold mb-2">Edit Link</h3>
                                <input
                                    value={linkInput}
                                    onChange={(e) => setLinkInput(e.target.value)}
                                    className="w-full border p-2 rounded mb-2 text-sm"
                                    placeholder="https://..."
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setEditingLink(null)} className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                                    <button onClick={handleUpdateLink} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Update</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Code Editor */}
                    {showCodeEditor && (
                        <div className="w-1/2 h-full border-l border-outline/10 flex flex-col bg-[#1e1e1e]">
                            <Editor
                                height="100%"
                                defaultLanguage="html"
                                value={htmlSource}
                                theme="vs-dark"
                                onChange={(value) => setHtmlSource(value || '')}
                                onMount={handleEditorDidMount}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    wordWrap: 'on',
                                    formatOnPaste: true,
                                    formatOnType: true,
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {showProfile && (
                <ProfileSettings onClose={() => setShowProfile(false)} />
            )}
        </div>
    );
}
