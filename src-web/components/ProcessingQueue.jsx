import { useMemo } from 'react';

export default function ProcessingQueue({ files = [], progress = {}, results = {} }) {
    const totalFiles = files.length;
    const completedCount = Object.values(results).filter(Boolean).length;
    const processingFile = Object.entries(progress).find(([, p]) => p && p < 100)?.[0];

    const overallPercent = totalFiles > 0
        ? Math.round((completedCount / totalFiles) * 100)
        : 0;

    if (totalFiles === 0) return null;

    return (
        <div className="processing-queue">
            {/* Overall progress */}
            <div className="control-header">
                <span className="label">
                    {completedCount === totalFiles
                        ? `✅ ${totalFiles} archivos procesados`
                        : `⚡ Procesando ${completedCount + 1} de ${totalFiles}...`
                    }
                </span>
                <span className="value">{overallPercent}%</span>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${overallPercent}%` }}
                />
            </div>

            {/* File list */}
            <div className="file-list" style={{ marginTop: 12 }}>
                {files.map((file, idx) => {
                    const fileProgress = progress[file.name] || 0;
                    const isComplete = !!results[file.name];
                    const isProcessing = processingFile === file.name;

                    if (!isProcessing && !isComplete && overallPercent < 100) return null; // Only show active/done to save space

                    return (
                        <div key={idx} className={`file-item ${isProcessing ? 'selected' : ''}`} style={{ cursor: 'default' }}>
                            <div className="file-info">
                                <span style={{ marginRight: 6 }}>
                                    {isComplete ? '✅' : isProcessing ? '⏳' : '⬜'}
                                </span>
                                <span className="file-name">{file.name}</span>
                            </div>
                            {isProcessing && (
                                <div className="progress-bar mini" style={{ width: 50 }}>
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${fileProgress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
