import React, { useState, useRef } from 'react';
import { Upload, Link, X, CheckCircle2, Loader2 } from 'lucide-react';

interface UploadZoneProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
}

const UploadZone: React.FC<UploadZoneProps> = ({ value, onChange, label }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setIsUploading(true);
        // Simulation d'upload
        // Dans un vrai projet, on utiliserait supabase.storage ici
        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onChange(base64String);
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Upload error:", error);
            setIsUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    return (
        <div className="upload-zone-container">
            {label && <label className="form-label">{label}</label>}
            
            <div 
                className={`upload-box ${dragActive ? 'drag-active' : ''} ${value ? 'has-value' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {value ? (
                    <div className="preview-container">
                        <img src={value} alt="Preview" className="preview-img" />
                        <div className="preview-overlay">
                            <button className="btn-icon danger" onClick={() => onChange('')}>
                                <X size={16} />
                            </button>
                            <div className="preview-badge">
                                <CheckCircle2 size={14} /> Image prête
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="upload-placeholder" onClick={() => fileInputRef.current?.click()}>
                        {isUploading ? (
                            <Loader2 className="animate-spin text-primary" size={32} />
                        ) : (
                            <>
                                <Upload size={32} className="text-muted" />
                                <p className="text-sm mt-10">
                                    <strong>Cliquez pour uploader</strong> ou glissez-déposez
                                </p>
                                <p className="text-xs text-muted">PNG, JPG ou GIF (max. 2MB)</p>
                            </>
                        )}
                    </div>
                )}
                <input 
                    ref={fileInputRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileInput}
                />
            </div>

            <div className="url-input-wrap mt-10">
                <div className="icon-input">
                    <Link size={14} className="input-icon" />
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ou collez une URL d'image ici..." 
                        value={value?.startsWith('data:') ? '' : value}
                        onChange={(e) => onChange(e.target.value)}
                    />
                </div>
            </div>

            <style>{`
                .upload-box {
                    border: 2px dashed var(--border);
                    border-radius: 12px;
                    height: 180px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-app);
                    transition: all 0.2s ease;
                    position: relative;
                    overflow: hidden;
                    cursor: pointer;
                }
                .upload-box.drag-active {
                    border-color: var(--primary);
                    background: rgba(43,46,131,0.05);
                }
                .upload-box.has-value {
                    border-style: solid;
                    border-color: var(--primary);
                }
                .upload-placeholder {
                    text-align: center;
                    padding: 20px;
                }
                .preview-container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                }
                .preview-img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .preview-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .preview-container:hover .preview-overlay {
                    opacity: 1;
                }
                .preview-badge {
                    background: #10b981;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    margin-top: 10px;
                }
                .url-input-wrap {
                    position: relative;
                }
                .icon-input {
                    position: relative;
                }
                .input-icon {
                    position: absolute;
                    left: 12px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }
                .icon-input .form-input {
                    padding-left: 36px;
                    font-size: 0.85rem;
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .hidden { display: none; }
            `}</style>
        </div>
    );
};

export default UploadZone;
