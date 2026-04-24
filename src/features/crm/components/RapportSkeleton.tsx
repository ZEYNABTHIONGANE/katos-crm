
const RapportSkeleton = () => {
    return (
        <div className="rapports-page skeleton-loading">
            <div className="page-header d-flex-between mb-8">
                <div className="skeleton-item" style={{ width: '300px', height: '40px', borderRadius: '8px' }}></div>
                <div className="d-flex gap-3">
                    <div className="skeleton-item" style={{ width: '120px', height: '40px', borderRadius: '8px' }}></div>
                    <div className="skeleton-item" style={{ width: '120px', height: '40px', borderRadius: '8px' }}></div>
                </div>
            </div>

            <div className="rapports-toolbar card-premium mb-8">
                <div className="skeleton-item" style={{ width: '200px', height: '24px', borderRadius: '4px' }}></div>
            </div>

            <div className="rapports-grid mb-8">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="rpt-card card-premium shadow-none border-none bg-white/50">
                        <div className="skeleton-item mb-4" style={{ width: '40px', height: '40px', borderRadius: '12px' }}></div>
                        <div className="skeleton-item mb-2" style={{ width: '60%', height: '28px' }}></div>
                        <div className="skeleton-item" style={{ width: '40%', height: '16px' }}></div>
                    </div>
                ))}
            </div>

            <div className="rapports-layout">
                <div className="rpt-section card-premium">
                    <div className="skeleton-item mb-6" style={{ width: '200px', height: '24px' }}></div>
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="d-flex align-center gap-4 py-2 border-b border-gray-50">
                                <div className="skeleton-item" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                                <div className="skeleton-item flex-1" style={{ height: '20px' }}></div>
                                <div className="skeleton-item" style={{ width: '100px', height: '20px' }}></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rpt-section card-premium">
                    <div className="skeleton-item mb-6" style={{ width: '150px', height: '24px' }}></div>
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i}>
                                <div className="d-flex justify-between mb-2">
                                    <div className="skeleton-item" style={{ width: '100px', height: '16px' }}></div>
                                    <div className="skeleton-item" style={{ width: '40px', height: '16px' }}></div>
                                </div>
                                <div className="skeleton-item" style={{ width: '100%', height: '8px', borderRadius: '4px' }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
                .skeleton-loading .skeleton-item {
                    background: linear-gradient(90deg, #f0f0f0 25%, #f8f8f8 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: skeleton-shimmer 1.5s infinite;
                }

                @keyframes skeleton-shimmer {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                .space-y-4 > * + * { margin-top: 1rem; }
                .space-y-6 > * + * { margin-top: 1.5rem; }
            `}</style>
        </div>
    );
};

export default RapportSkeleton;
