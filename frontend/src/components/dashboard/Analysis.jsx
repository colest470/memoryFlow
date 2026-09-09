import React, { useEffect, useState } from "react";
import { getAnalysis } from "../../lib/api/projects";

const Analysis = ({ projectId }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('summary');

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                const response = await getAnalysis(projectId);
                setAnalysis(response.analysis);
            } catch (error) {
                console.error("Error fetching analysis:", error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        if (projectId) {
            fetchAnalysis();
        }
    }, [projectId]);

    if (loading) {
        return (
            <div className="text-white p-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-2"></div>
                Loading analysis...
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-400 p-4">
                Error loading analysis: {error}
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="text-gray-400 p-4">
                No analysis data available. Analyze project first.
            </div>
        );
    }

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high': return 'text-red-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-blue-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="text-white space-y-6">
            {/* Header with metadata */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-orange-400">Project Analysis</h2>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex border-b border-gray-700">
                <button
                    onClick={() => setActiveTab('summary')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'summary' 
                            ? 'text-orange-400 border-b-2 border-orange-400' 
                            : 'text-gray-400 hover:text-gray-300'
                    }`}
                >
                    Summary
                </button>
                <button
                    onClick={() => setActiveTab('gaps')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'gaps' 
                            ? 'text-orange-400 border-b-2 border-orange-400' 
                            : 'text-gray-400 hover:text-gray-300'
                    }`}
                >
                    Gaps ({analysis.identified_gaps?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab('topics')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === 'topics' 
                            ? 'text-orange-400 border-b-2 border-orange-400' 
                            : 'text-gray-400 hover:text-gray-300'
                    }`}
                >
                    Topics
                </button>
            </div>

            {/* Tab Content */}
            <div className="space-y-6">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                    <>
                        {analysis.executive_summary && (
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <h3 className="text-lg font-semibold text-orange-400 mb-2">Executive Summary</h3>
                                <p className="text-gray-300 leading-relaxed">{analysis.executive_summary}</p>
                            </div>
                        )}

                        {analysis.overall_summary && analysis.overall_summary !== analysis.executive_summary && (
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <h3 className="text-lg font-semibold text-orange-400 mb-2">Overall Summary</h3>
                                <p className="text-gray-300 leading-relaxed">{analysis.overall_summary}</p>
                            </div>
                        )}

                        {analysis.key_findings && analysis.key_findings.length > 0 && (
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <h3 className="text-lg font-semibold text-orange-400 mb-3">Key Findings</h3>
                                <ul className="space-y-2">
                                    {analysis.key_findings.map((finding, index) => (
                                        <li key={index} className="flex items-start gap-2 text-gray-300">
                                            <span className="text-orange-500 mt-1">•</span>
                                            <span>{finding}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {analysis.recommendations && analysis.recommendations.length > 0 && (
                            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                                <h3 className="text-lg font-semibold text-orange-400 mb-3">Recommendations</h3>
                                <ul className="space-y-2">
                                    {analysis.recommendations.map((rec, index) => (
                                        <li key={index} className="flex items-start gap-2 text-gray-300">
                                            <span className="text-green-500 mt-1">›</span>
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {analysis.sentiment_analysis && (
                            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                                <span className="text-sm text-gray-400">Sentiment: </span>
                                <span className="text-sm text-gray-300">{analysis.sentiment_analysis}</span>
                            </div>
                        )}
                    </>
                )}

                {/* Gaps Tab */}
                {activeTab === 'gaps' && analysis.identified_gaps && analysis.identified_gaps.length > 0 && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-orange-400 mb-4">Identified Gaps</h3>
                        <div className="space-y-4">
                            {analysis.identified_gaps.map((gap, index) => (
                                <div key={index} className="border-b border-gray-700/50 pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <h4 className="text-white font-medium">{gap.gap}</h4>
                                        <span className={`text-xs font-semibold ${getPriorityColor(gap.priority)} uppercase`}>
                                            {gap.priority} Priority
                                        </span>
                                    </div>
                                    {gap.recommendation && (
                                        <p className="text-gray-400 text-sm mt-1">
                                            <span className="text-green-400">Recommendation:</span> {gap.recommendation}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Topics Tab */}
                {activeTab === 'topics' && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-orange-400 mb-3">Top Topics</h3>
                        {analysis.top_topics && analysis.top_topics.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {analysis.top_topics.map((topic, index) => (
                                    <span key={index} className="bg-gray-700/50 px-3 py-1 rounded-full text-sm text-gray-300 border border-gray-600">
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400">No topics available</p>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50 mt-4">
                <div className="flex justify-between text-sm text-gray-400">
                    {analysis.generated_at && (
                        <span>Generated: {new Date(analysis.generated_at).toLocaleString()}</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Analysis;