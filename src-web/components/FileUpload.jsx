import { useState, useRef, useCallback } from 'react';

const IMG_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.webp', '.bmp',
    '.arw', '.cr2', '.cr3', '.nef', '.dng', '.raf', '.orf',
    '.rw2', '.pef', '.srw',
]);

function isValidImage(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    return IMG_EXTENSIONS.has(ext);
}

export default function FileUpload({ onFilesSelected, mode = 'bulk', disabled = false }) {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleFiles = useCallback((fileList) => {
        const valid = Array.from(fileList).filter(isValidImage);
        if (valid.length === 0) return;
        onFilesSelected(valid);
    }, [onFilesSelected]);

    const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const onDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        handleFiles(e.dataTransfer.files);
    };

    if (mode === 'button') {
        return (
            <>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*,.arw,.cr2,.cr3,.nef,.dng,.raf,.orf,.rw2,.pef,.srw"
                    onChange={(e) => handleFiles(e.target.files)}
                    style={{ display: 'none' }}
                />
                <button
                    className="btn btn-secondary"
                    onClick={() => !disabled && inputRef.current?.click()}
                    disabled={disabled}
                    style={{ width: '100%', justifyContent: 'center' }}
                >
                    + Agregar Fotos
                </button>
            </>
        );
    }

    return (
        <div
            className={`empty-state ${isDragging ? 'dragging' : ''}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
        >
            <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/*,.arw,.cr2,.cr3,.nef,.dng,.raf,.orf,.rw2,.pef,.srw"
                onChange={(e) => handleFiles(e.target.files)}
                style={{ display: 'none' }}
            />
            <div style={{ fontSize: 32, marginBottom: 10 }}>
                {isDragging ? '📥' : '📸'}
            </div>
            <div>
                {isDragging ? 'Soltar archivos aquí' : 'Arrastrá imágenes o hacé click'}
            </div>
            <div style={{ fontSize: 10, marginTop: 6, opacity: 0.6 }}>
                JPG · PNG · RAW (CR2, ARW...)
            </div>
        </div>
    );
}
