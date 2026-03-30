import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { apiClient } from '../services/apiClient';
import toast from 'react-hot-toast';

export function ImageUploader({ maxFiles = 3, onUploadComplete }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = async (e) => {
        const selectedFiles = Array.from(e.target.files);

        // Validate
        const validFiles = selectedFiles.filter(file => {
            const isValidType = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
            if (!isValidType) toast.error(`${file.name} không phải là ảnh`);
            if (!isValidSize) toast.error(`${file.name} quá lớn (>5MB)`);
            return isValidType && isValidSize;
        });

        if (validFiles.length === 0) return;
        if (files.length + validFiles.length > maxFiles) {
            toast.error(`Chỉ được upload tối đa ${maxFiles} ảnh`);
            return;
        }

        setUploading(true);
        const uploadedUrls = [];

        // Upload sequentially
        for (const file of validFiles) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const res = await apiClient.post('/upload/image', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                if (res.data && res.data.url) {
                    // Adjust URL if it's relative
                    const url = res.data.url.startsWith('http') ? res.data.url : `${import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')}${res.data.url}`;
                    uploadedUrls.push(url);
                }
            } catch (error) {
                console.error(error);
                toast.error(`Lỗi upload ảnh ${file.name}`);
            }
        }

        setFiles(prev => [...prev, ...uploadedUrls]);
        setUploading(false);
        if (onUploadComplete) onUploadComplete([...files, ...uploadedUrls]);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeImage = (index) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        if (onUploadComplete) onUploadComplete(newFiles);
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Minh chứng (Ảnh)</label>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {files.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group">
                        <img src={url} alt="Proof" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                {files.length < maxFiles && (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 hover:bg-slate-50 cursor-pointer dark:border-slate-600 dark:hover:bg-slate-800 transition-colors"
                    >
                        {uploading ? (
                            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                        ) : (
                            <>
                                <Upload className="h-6 w-6 text-slate-400 mb-2" />
                                <span className="text-xs text-slate-500">Upload</span>
                            </>
                        )}
                    </div>
                )}
            </div>
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleFileChange}
            />
        </div>
    );
}
