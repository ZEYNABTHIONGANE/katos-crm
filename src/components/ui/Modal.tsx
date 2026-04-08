import { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
};

const Modal = ({ isOpen, onClose, title, children, size = 'md', className = '' }: Props) => {
    // Fermer avec Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className={`modal-container modal-${size} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    {title && <h2 className="modal-title">{title}</h2>}
                    <button className="modal-close" onClick={onClose} aria-label="Fermer">
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
