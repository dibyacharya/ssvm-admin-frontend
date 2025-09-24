import React, { useState, useEffect } from 'react';
import { FileText, Video, Presentation, Plus, Edit, Trash2, Eye, Download, Link, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { getCourseModules, addModuleContent, updateContentItem, deleteContentItem } from '../services/module.service';

const UploadedFile = () => {
  const { courseid } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState('pdfs');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  const contentTypes = {
    pdfs: { label: 'PDFs', icon: FileText },
    ppts: { label: 'Presentations', icon: Presentation },
    videos: { label: 'Videos', icon: Video },
    links: { label: 'Links', icon: Link }
  };

  useEffect(() => {
    if (courseid) {
      loadCourseModules();
    }
  }, [courseid]);

  const loadCourseModules = async () => {
    try {
      setIsLoading(true);
      const response = await getCourseModules(courseid);
      setCourseData(response);
      
      if (response.modules && response.modules.length > 0) {
        const firstModule = response.modules[0];
        setExpandedModule(firstModule._id);
        setSelectedModule(firstModule);
      }
    } catch (error) {
      console.error('Error loading course modules:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModuleToggle = (moduleId) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
      setSelectedModule(null);
    } else {
      setExpandedModule(moduleId);
      const module = courseData.modules.find(m => m._id === moduleId);
      setSelectedModule(module);
    }
  };

  const handleContentTypeSelect = (module, contentType) => {
    setSelectedContentType(contentType);
    setSelectedModule(module);
  };

  const handleAddContent = async (contentData, file, thumbnail) => {
    if (!selectedModule) return;

    try {
      const formData = new FormData();
      formData.append('contentType', selectedContentType.slice(0, -1));
      formData.append('name', contentData.name);
      formData.append('description', contentData.description || '');
      
      if (selectedContentType === 'links' && contentData.url) {
        formData.append('fileUrl', contentData.url);
        formData.append('linkType', 'external');
      }
      
      if (file) {
        formData.append('file', file);
      }
      
      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
      }

      await addModuleContent(courseid, selectedModule._id, formData);
      setShowAddModal(false);
      loadCourseModules();
      
    } catch (error) {
      console.error('Error adding content:', error);
    }
  };

  const handleDeleteContent = async (contentId) => {
    if (!selectedModule || !window.confirm('Are you sure you want to delete this content?')) return;

    try {
      await deleteContentItem(courseid, selectedModule._id, selectedContentType, contentId);
      loadCourseModules();
    } catch (error) {
      console.error('Error deleting content:', error);
    }
  };

  const handleUpdateContent = async (updatedData, file, thumbnail) => {
    if (!selectedModule || !editingItem) return;

    try {
      const formData = new FormData();
      formData.append('name', updatedData.name);
      formData.append('description', updatedData.description || '');
      
      if (selectedContentType === 'links' && updatedData.url) {
        formData.append('url', updatedData.url);
      }
      
      if (file) {
        formData.append('file', file);
      }
      
      if (thumbnail) {
        formData.append('thumbnail', thumbnail);
      }

      await updateContentItem(courseid, selectedModule._id, selectedContentType, editingItem._id, formData);
      setEditingItem(null);
      loadCourseModules();
      
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getContentItems = () => {
    if (!selectedModule || !selectedModule.content) return [];
    return selectedModule.content[selectedContentType] || [];
  };

  const getContentCount = (module, contentType) => {
    return module.contentCounts ? module.contentCounts[contentType] || 0 : 0;
  };

  const renderContentItems = () => {
    const items = getContentItems();
    
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg mb-2">No {contentTypes[selectedContentType]?.label.toLowerCase()} found</div>
          <div className="text-sm">Click "Add {contentTypes[selectedContentType]?.label}" to get started</div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => (
          <ContentCard 
            key={item._id} 
            item={item} 
            contentType={selectedContentType}
            onDelete={() => handleDeleteContent(item._id)}
            onEdit={() => setEditingItem(item)}
            formatFileSize={formatFileSize}
            formatDate={formatDate}
          />
        ))}
      </div>
    );
  };

  if (isLoading && !courseData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 ">
      {/* Left Sidebar - Module Accordion */}
      <div className="w-80 bg-white shadow-lg border-r ">
        <div className="p-6 border-b  max-h-[120px] min-h-[120px]">
          <h2 className="text-xl font-semibold text-gray-800">Course Modules</h2>
          <p className="text-sm text-gray-600 mt-1">{courseData?.courseInfo?.title}</p>
          <p className="text-xs text-gray-500">{courseData?.courseInfo?.courseCode}</p>
        </div>
        
        <div className="overflow-y-auto h-full pb-20">
          {courseData?.modules?.map((module) => (
            <div key={module._id} className="border-b">
              {/* Module Header */}
              <div 
                onClick={() => handleModuleToggle(module._id)}
                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                  expandedModule === module._id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">
                      Module {module.moduleNumber}: {module.moduleTitle}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {module.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      Total Content: {module.contentCounts?.total || 0}
                    </div>
                  </div>
                  <div className="ml-2">
                    {expandedModule === module._id ? (
                      <ChevronDown size={20} className="text-blue-600" />
                    ) : (
                      <ChevronRight size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Module Content - Accordion Panel */}
              {expandedModule === module._id && (
                <div className="bg-gray-50 px-4 pb-4">
                  <div className="space-y-2">
                    {Object.entries(contentTypes).map(([key, config]) => {
                      const Icon = config.icon;
                      const count = getContentCount(module, key);
                      
                      return (
                        <button
                          key={key}
                          onClick={() => handleContentTypeSelect(module, key)}
                          className={`w-full flex items-center justify-between p-3 rounded-md text-sm transition-colors ${
                            selectedModule?._id === module._id && selectedContentType === key
                              ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <Icon size={16} />
                            <span>{config.label}</span>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            selectedModule?._id === module._id && selectedContentType === key
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col">
        {selectedModule ? (
          <>
            {/* Header */}
            <div className="shadow-sm border-b p-6  max-h-[120px] min-h-[120px]">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Module {selectedModule.moduleNumber}: {selectedModule.moduleTitle}
                  </h1>
                  <p className="text-gray-600">
                    Viewing {contentTypes[selectedContentType]?.label}
                  </p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus size={20} />
                  <span>Add {contentTypes[selectedContentType]?.label}</span>
                </button>
              </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                renderContentItems()
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <FileText size={64} />
              </div>
              <h2 className="text-xl font-medium text-gray-600">Select a Module</h2>
              <p className="text-gray-500 mt-2">Choose a module from the left to view its content</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <AddContentModal
          contentType={selectedContentType}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddContent}
        />
      )}

      {/* Edit Content Modal */}
      {editingItem && (
        <EditContentModal
          item={editingItem}
          contentType={selectedContentType}
          onClose={() => setEditingItem(null)}
          onUpdate={handleUpdateContent}
        />
      )}
    </div>
  );
};

// Content Card Component
const ContentCard = ({ item, contentType, onDelete, onEdit, formatFileSize, formatDate }) => {
  const getFileIcon = () => {
    switch (contentType) {
      case 'pdfs':
        return <FileText className="text-red-500" size={24} />;
      case 'ppts':
        return <Presentation className="text-orange-500" size={24} />;
      case 'videos':
        return <Video className="text-blue-500" size={24} />;
      case 'links':
        return <Link className="text-green-500" size={24} />;
      default:
        return <FileText className="text-gray-500" size={24} />;
    }
  };

  const handleViewClick = () => {
    if (contentType === 'links') {
      window.open(item.fileUrl, '_blank');
    } else {
      const fileUrl = item.fileUrl;
      if (fileUrl) {
        window.open(fileUrl, '_blank');
      }
    }
  };

  const handleDownload = () => {
    const fileUrl = item.fileUrl;
    const fileName = item.name || 'download';
    
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="h-40 bg-gray-100 flex items-center justify-center">
        {item.thumbnail?.thumbnailUrl ? (
          <img 
            src={item.thumbnail.thumbnailUrl} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400">
            {getFileIcon()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Show URL for links */}
        {contentType === 'links' && item.fileUrl && (
          <div className="mb-3">
            <p className="text-xs text-blue-600 truncate" title={item.fileUrl}>
              {item.fileUrl}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          {item.fileSize && (
            <span>{formatFileSize(item.fileSize)}</span>
          )}
          {item.createDate && (
            <span>{formatDate(item.createDate)}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={handleViewClick}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title={contentType === 'links' ? 'Open Link' : 'View'}
            >
              {contentType === 'links' ? <ExternalLink size={16} /> : <Eye size={16} />}
            </button>
            
            {/* Download button for files only */}
            {contentType !== 'links' && (
              <button
                onClick={handleDownload}
                className="text-purple-600 hover:text-purple-800 transition-colors"
                title="Download"
              >
                <Download size={16} />
              </button>
            )}
            
            <button
              onClick={onEdit}
              className="text-green-600 hover:text-green-800 transition-colors"
              title="Edit"
            >
              <Edit size={16} />
            </button>
          </div>
          <button
            onClick={onDelete}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Add Content Modal Component
const AddContentModal = ({ contentType, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: ''
  });
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);

  const contentTypeLabels = {
    pdfs: 'PDF',
    ppts: 'Presentation',
    videos: 'Video',
    links: 'Link'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (contentType === 'links' && !formData.url.trim()) return;
    if (contentType !== 'links' && !file) return;
    
    onAdd(formData, file, thumbnail);
  };

  const getAcceptedFileTypes = () => {
    switch (contentType) {
      case 'pdfs':
        return '.pdf';
      case 'ppts':
        return '.ppt,.pptx';
      case 'videos':
        return '.mp4,.avi,.mov,.wmv,.flv,.webm';
      case 'links':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">
          Add {contentTypeLabels[contentType]}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {contentType === 'links' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
                required
              />
            </div>
          )}

          {contentType !== 'links' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                File *
              </label>
              <input
                type="file"
                accept={getAcceptedFileTypes()}
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thumbnail
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files[0])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!formData.name.trim()) || (contentType === 'links' && !formData.url.trim()) || (contentType !== 'links' && !file)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Content Modal Component
const EditContentModal = ({ item, contentType, onClose, onUpdate }) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
    description: item.description || '',
    url: item.fileUrl || ''
  });
  const [file, setFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);

  const contentTypeLabels = {
    pdfs: 'PDF',
    ppts: 'Presentation',
    videos: 'Video',
    links: 'Link'
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (contentType === 'links' && !formData.url.trim()) return;
    
    onUpdate(formData, file, thumbnail);
  };

  const getAcceptedFileTypes = () => {
    switch (contentType) {
      case 'pdfs':
        return '.pdf';
      case 'ppts':
        return '.ppt,.pptx';
      case 'videos':
        return '.mp4,.avi,.mov,.wmv,.flv,.webm';
      case 'links':
        return '';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">
          Edit {contentTypeLabels[contentType]}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {contentType === 'links' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
                required
              />
            </div>
          )}

          {contentType !== 'links' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Replace File (optional)
              </label>
              <input
                type="file"
                accept={getAcceptedFileTypes()}
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Replace Thumbnail (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files[0])}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim() || (contentType === 'links' && !formData.url.trim())}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Update
            </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default UploadedFile;