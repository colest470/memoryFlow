import React, {useEffect, useState} from "react";
import { getAnalysis } from "../../lib/api/projects"; 

const Analysis = ({ projectId }) => {
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                setLoading(true);
                const response = await getAnalysis(projectId);
                const data = response;
                setAnalysis(data);
                console.log("Analysis data:", data);
            } catch(error){
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
                No analysis data available Analyze project first
            </div>
        );
    }

    return (
        <div className="text-white space-y-6">
            {analysis.executive_summary && (
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">Executive Summary</h3>
                    <p className="text-gray-300">{analysis.executive_summary}</p>
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

            <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                <div className="flex justify-between text-sm text-gray-400">
                    <span>Entries analyzed: {analysis.entry_count || 'N/A'}</span>
                    {analysis.generated_at && (
                        <span>Generated: {new Date(analysis.generated_at).toLocaleDateString()}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Analysis;