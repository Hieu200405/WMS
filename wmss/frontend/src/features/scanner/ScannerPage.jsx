import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Scan, Search, Package, MapPin, Loader, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "../../services/apiClient.js";
import clsx from "clsx";

export function ScannerPage() {
    const { t } = useTranslation();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [history, setHistory] = useState([]);

    const inputRef = useRef(null);

    useEffect(() => {
        // Auto focus on simplified scanner mode
        inputRef.current?.focus();

        // Listen for window focus to refocus
        const handleFocus = () => inputRef.current?.focus();
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const handleScan = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            // 1. Try finding product
            const productRes = await apiClient.get(`/products?query=${query}&limit=1`);
            if (productRes.data && productRes.data.length > 0) {
                const product = productRes.data[0];
                // Fetch inventory details for this product
                // We'll mock this for now or fetch via inventory endpoint if possible, 
                // but showing product basic info is a good start.
                // Actually, let's try to get inventory summary:
                // const invRes = await apiClient.get('/inventory?productId=' + product.id);

                const scanResult = {
                    type: 'product',
                    data: product,
                    timestamp: new Date()
                };
                setResult(scanResult);
                addToHistory(scanResult);
                setQuery("");
                return;
            }

            // 2. Try finding location/node
            const nodeRes = await apiClient.get(`/warehouse?query=${query}&limit=1`);
            if (nodeRes.data && nodeRes.data.length > 0) {
                const node = nodeRes.data[0];
                const scanResult = {
                    type: 'node',
                    data: node,
                    timestamp: new Date()
                };
                setResult(scanResult);
                addToHistory(scanResult);
                setQuery("");
                return;
            }

            setError("No product or location found.");
        } catch (err) {
            console.error(err);
            setError("Error occurred while scanning.");
        } finally {
            setLoading(false);
            // Refocus for next scan
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const addToHistory = (item) => {
        setHistory(prev => [item, ...prev].slice(0, 10));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-900">
            {/* Search Header */}
            <div className="p-4 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
                <form onSubmit={handleScan} className="relative max-w-2xl mx-auto">
                    <Scan className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full pl-12 pr-4 py-4 text-xl rounded-xl border-2 border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400"
                        placeholder="Scan Barcode / SKU..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? <Loader className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    </button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-2">
                    Press <strong>Enter</strong> or use scanner to search. Supports Products and Locations.
                </p>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4">
                <div className="max-w-2xl mx-auto space-y-6">

                    {/* Error State */}
                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300">
                            <XCircle className="h-6 w-6" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Result Card */}
                    {result && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">

                                {/* Product Result */}
                                {result.type === 'product' && (
                                    <div>
                                        <div className="h-32 bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                            <Package className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                                        </div>
                                        <div className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                                                        Product
                                                    </span>
                                                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                                                        {result.data.name}
                                                    </h2>
                                                    <p className="text-lg text-slate-500 dark:text-slate-400 font-mono mt-1">
                                                        {result.data.sku}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Price In / Out</p>
                                                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                                                        ${result.data.priceIn} / ${result.data.priceOut}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                                <div>
                                                    <p className="text-sm text-slate-500">Unit</p>
                                                    <p className="font-semibold">{result.data.unit}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Min Stock</p>
                                                    <p className="font-semibold">{result.data.minStock}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Node Result */}
                                {result.type === 'node' && (
                                    <div>
                                        <div className="h-32 bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                            <MapPin className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="p-6">
                                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">
                                                Location
                                            </span>
                                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                                                {result.data.name}
                                            </h2>
                                            <p className="text-lg text-slate-500 dark:text-slate-400 font-mono mt-1">
                                                {result.data.barcode || result.data.code}
                                            </p>

                                            <div className="mt-4 grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg">
                                                <div>
                                                    <p className="text-sm text-slate-500">Type</p>
                                                    <p className="font-semibold capitalize">{result.data.type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Capacity</p>
                                                    <p className="font-semibold">
                                                        {result.data.capacity ? result.data.capacity : 'Unlimited'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recent Scans */}
                    {history.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Recent Scans
                            </h3>
                            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                                {history.map((h, i) => (
                                    <div key={i} className="p-3 flex items-center gap-3">
                                        {h.type === 'product' ? (
                                            <Package className="h-5 w-5 text-indigo-500" />
                                        ) : (
                                            <MapPin className="h-5 w-5 text-emerald-500" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 dark:text-white truncate">
                                                {h.data.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {h.type === 'product' ? h.data.sku : h.data.code}
                                            </p>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {h.timestamp.toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
