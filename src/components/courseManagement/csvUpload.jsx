import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, File, FileSpreadsheet } from 'lucide-react';
import { uploadUsersCSV } from '../../services/courses.service';

// Import or define your API function here

const CSVUpload = ({ onClose, onSuccess, acceptedFormats = ['csv', 'xlsx', 'xls', 'json', 'txt'] }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const fileTypeConfig = {
    csv: { 
      mimeTypes: ['text/csv', 'application/csv'], 
      extensions: ['.csv'],
      icon: FileText,
      color: 'text-green-500'
    },
    xlsx: { 
      mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], 
      extensions: ['.xlsx'],
      icon: FileSpreadsheet,
      color: 'text-blue-500'
    },
    xls: { 
      mimeTypes: ['application/vnd.ms-excel'], 
      extensions: ['.xls'],
      icon: FileSpreadsheet,
      color: 'text-blue-500'
    },
    json: { 
      mimeTypes: ['application/json'], 
      extensions: ['.json'],
      icon: File,
      color: 'text-purple-500'
    },
    txt: { 
      mimeTypes: ['text/plain'], 
      extensions: ['.txt'],
      icon: FileText,
      color: 'text-gray-500'
    }
  };

  const isValidFileType = (file) => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    return acceptedFormats.some(format => {
      const config = fileTypeConfig[format];
      if (!config) return false;
      
      return config.extensions.some(ext => fileName.endsWith(ext)) ||
             config.mimeTypes.some(mime => fileType === mime);
    });
  };

  const getFileIcon = (filename) => {
    const extension = filename.toLowerCase().split('.').pop();
    const config = fileTypeConfig[extension];
    if (!config) return { Icon: File, color: 'text-gray-500' };
    return { Icon: config.icon, color: config.color };
  };

  const previewFile = async (file) => {
    if (!file) return;

    const extension = file.name.toLowerCase().split('.').pop();
    
    try {
      if (extension === 'csv') {
        const text = await file.text();
        const lines = text.split('\n').slice(0, 5); // First 5 lines
        setPreviewData({
          type: 'csv',
          lines: lines.filter(line => line.trim())
        });
      } else if (extension === 'json') {
        const text = await file.text();
        const jsonData = JSON.parse(text);
        setPreviewData({
          type: 'json',
          preview: JSON.stringify(jsonData, null, 2).substring(0, 500) + '...'
        });
      } else if (extension === 'txt') {
        const text = await file.text();
        setPreviewData({
          type: 'txt',
          preview: text.substring(0, 500) + (text.length > 500 ? '...' : '')
        });
      }
    } catch (err) {
      console.error('Preview error:', err);
      setPreviewData(null);
    }
  };

  const handleFileChange = (selectedFile) => {
    setError('');
    setSuccess('');
    setPreviewData(null);
    
    if (selectedFile) {
      if (!isValidFileType(selectedFile)) {
        const formats = acceptedFormats.join(', ').toUpperCase();
        setError(`Please select a valid file. Accepted formats: ${formats}`);
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      previewFile(selectedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const processFile = async (file) => {
    // Use the real API call instead of dummy data
    try {
      const result = await uploadUsersCSV(file);
      return {
        message: result.message || 'Users uploaded successfully',
        data: result,
        type: 'csv'
      };
    } catch (error) {
      // Re-throw with more specific error handling
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Failed to upload users. Please check your file format and try again.'
      );
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const result = await processFile(file);
      setSuccess(`Successfully uploaded! ${result.message || 'File has been processed.'}`);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      // Clear file after successful upload
      setFile(null);
      setPreviewData(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.message || 
        'Failed to process file. Please try again.'
      );
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    setSuccess('');
    setPreviewData(null);
  };

  const acceptString = acceptedFormats.map(format => 
    fileTypeConfig[format]?.extensions.join(',') || ''
  ).join(',');

  const { Icon: FileIcon, color } = file ? getFileIcon(file.name) : { Icon: Upload, color: 'text-gray-400' };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Upload Users File</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={uploading}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Upload Area */}
        <div className="mb-6">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : file
                ? 'border-green-500 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileIcon className={`w-8 h-8 ${color} mr-3`} />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeFile}
                  className="text-red-500 hover:text-red-700"
                  disabled={uploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">
                  Drag and drop your file here, or
                </p>
                <label className="inline-block">
                  <input
                    type="file"
                    accept={acceptString}
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={uploading}
                  />
                  <span className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                    Browse Files
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Accepted formats: {acceptedFormats.join(', ').toUpperCase()} (up to 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* File Preview */}
        {previewData && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">File Preview:</h3>
            {previewData.type === 'csv' && (
              <div className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                {previewData.lines.join('\n')}
              </div>
            )}
            {(previewData.type === 'json' || previewData.type === 'txt') && (
              <div className="text-sm font-mono text-gray-700 whitespace-pre-wrap">
                {previewData.preview}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        {/* Format-specific Instructions */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">Supported Formats:</h3>
          <div className="text-sm text-blue-800 space-y-2">
            {acceptedFormats.includes('csv') && (
              <div>
                <strong>CSV:</strong> Include headers (name, email, role, mobileNo), one record per row
              </div>
            )}
            {(acceptedFormats.includes('xlsx') || acceptedFormats.includes('xls')) && (
              <div>
                <strong>Excel:</strong> First row should contain headers, data in subsequent rows
              </div>
            )}
            {acceptedFormats.includes('json') && (
              <div>
                <strong>JSON:</strong> Array of objects or single object with user data
              </div>
            )}
            {acceptedFormats.includes('txt') && (
              <div>
                <strong>Text:</strong> Structured text data (tab or comma separated)
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              !file || uploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading Users...
              </div>
            ) : (
              'Upload Users'
            )}
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVUpload;