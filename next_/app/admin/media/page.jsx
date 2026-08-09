"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import '@/app/admin/css/custom.css';
import '@/app/admin/css/datatable.css';
import AdminModal from '@/components/admin/AdminModal';
import * as api from '@/services/adminApi';
import { useAdminData } from '@/context/AdminDataContext';
import { useToast } from '@/context/ToastContext';
import Loader from '@/components/admin/ui/Loader';
import ErrorBanner from '@/components/admin/ui/ErrorBanner';
import PageHeader from '@/components/admin/ui/PageHeader';
import { getFileUrl } from '@/lib/utils';
import { useMediaLibrary } from '@/hooks/useMediaLibrary';
import { FaImage, FaTrashAlt, FaFolder, FaLevelUpAlt, FaFolderOpen, FaPlusCircle, FaFolderPlus, FaExclamationTriangle, FaEdit, FaLink, FaExternalLinkAlt } from 'react-icons/fa';

const MediaList = () => {
    const toast = useToast();
    const { data, loading, errors, refetch } = useAdminData();
    const files = data.media || [];
    
    const [uploading, setUploading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [deleteModal, setDeleteModal] = useState(false);
    const [fileToDelete, setFileToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [inputSizeMB, setInputSizeMB] = useState(3);
    const [activeMaxImageSizeMB, setActiveMaxImageSizeMB] = useState(3);

    // Custom dialogs state replacements
    const [renameFolderData, setRenameFolderData] = useState({ isOpen: false, oldName: '', oldPath: '', newName: '' });
    const [deleteFolderData, setDeleteFolderData] = useState({ isOpen: false, folderName: '', folderPath: '' });

    const itemsPerPage = 10;
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);
    
    const {
        currentFolder,
        searchTerm,
        setSearchTerm,
        navigateToPath,
        navigateUp,
        allItems,
        isSearching
    } = useMediaLibrary(files);

    // Pagination logic
    const totalPages = Math.ceil(allItems.length / itemsPerPage);
    const paginatedItems = allItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, currentFolder]);

    const handleUpload = async (e, isFolder = false) => {
        const filesToUpload = Array.from(e.target.files);
        if (filesToUpload.length === 0) return;

        const formData = new FormData();
        const paths = [];
        let validFileCount = 0;

        for (const file of filesToUpload) {
            if (file.type.startsWith('image/')) {
                const maxSizeInBytes = (activeMaxImageSizeMB || 3) * 1024 * 1024;
                if (file.size > maxSizeInBytes) {
                    toast?.error?.(`Image "${file.name}" size must be less than ${activeMaxImageSizeMB || 3}MB`);
                    continue;
                }
            }
            if (file.type.startsWith('video/')) {
                const maxVideoSizeInBytes = 700 * 1024 * 1024;
                if (file.size > maxVideoSizeInBytes) {
                    toast?.error?.(`Video "${file.name}" size exceeds maximum 700MB limit`);
                    continue;
                }
            }
            formData.append('file', file);
            validFileCount++;
            
            const base = currentFolder === '/' ? '' : currentFolder;
            if (isFolder && file.webkitRelativePath) {
                paths.push(base + '/' + file.webkitRelativePath);
            } else {
                paths.push(base + '/' + file.name);
            }
        }

        if (validFileCount === 0) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (folderInputRef.current) folderInputRef.current.value = '';
            return;
        }

        if (paths.length > 0) {
            formData.append('paths', JSON.stringify(paths));
        }

        setUploading(true);
        const res = await api.uploadMedia(formData);
        setUploading(false);

        if (res.error) {
            toast?.error?.(res.error);
        } else {
            toast?.success?.('Files uploaded successfully');
            refetch.media();
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    const confirmDelete = (file) => {
        setFileToDelete(file);
        setDeleteModal(true);
    };

    const executeRenameFolder = async (e) => {
        if (e) e.preventDefault();
        const { oldPath, newName } = renameFolderData;
        if (!newName || newName.trim() === '') return;
        
        const base = oldPath.split('/');
        base.pop();
        const newPath = (base.join('/') || '/') + (base.length > 0 && base[0] !== '' ? '/' : '') + newName.trim();
        
        const res = await api.renameFolder({ oldPath, newPath });
        if (res.success) {
            toast?.success?.(`Folder renamed successfully`);
            setRenameFolderData({ isOpen: false, oldName: '', oldPath: '', newName: '' });
            refetch.media();
        } else {
            toast?.error?.(res.error || 'Failed to rename folder');
        }
    };

    const executeDeleteFolder = async () => {
        const { folderPath } = deleteFolderData;
        const res = await api.deleteFolder({ folderPath });
        if (res.success) {
            toast?.success?.(`Folder deleted successfully`);
            setDeleteFolderData({ isOpen: false, folderName: '', folderPath: '' });
            refetch.media();
        } else {
            toast?.error?.(res.error || 'Failed to delete folder');
        }
    };

    const handleFileDrop = async (mediaId, targetFolderName) => {
        const targetPath = currentFolder === '/' ? '/' + targetFolderName : currentFolder + '/' + targetFolderName;
        try {
            const res = await api.updateMedia(mediaId, { folderPath: targetPath });
            if (res.success) {
                toast?.success?.(`Media moved to "${targetFolderName}"`);
                refetch.media?.();
            } else {
                toast?.error?.(res.error || 'Failed to move file');
            }
        } catch (err) {
            toast?.error?.('Failed to move media file');
        }
    };

    const handleDelete = async () => {
        if (!fileToDelete) return;
        setIsDeleting(true);
        try {
            const { error, success } = await api.deleteMedia(fileToDelete.id);
            
            if (success) {
                setDeleteModal(false);
                setFileToDelete(null);
                toast?.success?.('Media deleted successfully');
                refetch.media();
            } else {
                toast?.error?.(error || 'Failed to delete media');
            }
        } catch (err) {
            toast?.error?.('An unexpected error occurred');
        } finally {
            setIsDeleting(false);
        }
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(Number(bytes)) / Math.log(k));
        return parseFloat((Number(bytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const mediaStats = useMemo(() => {
        let totalImages = 0;
        let totalVideos = 0;
        let totalFolders = 0;
        let totalBytes = 0;

        files.forEach(item => {
            if (item.isFolder || item.type === 'folder' || item.mimeType === 'folder') {
                totalFolders++;
            } else {
                const size = Number(item.fileSize || item.size || item.originalSize || 0);
                totalBytes += size;

                const fileName = (item.fileName || item.name || item.filePath || '').toLowerCase();
                const isVid = fileName.endsWith('.mp4') || fileName.endsWith('.webm') || fileName.endsWith('.mov') || item.mimeType?.includes('video') || item.type === 'video';

                if (isVid) {
                    totalVideos++;
                } else {
                    totalImages++;
                }
            }
        });

        const formatStorage = (bytes) => {
            if (!bytes || bytes === 0) return '0.00 MB';
            const mb = bytes / (1024 * 1024);
            if (mb >= 1024) return (mb / 1024).toFixed(2) + ' GB';
            return mb.toFixed(2) + ' MB';
        };

        return {
            totalImages,
            totalVideos,
            totalFolders,
            totalItems: files.length,
            formattedSize: formatStorage(totalBytes)
        };
    }, [files]);

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader 
                title="Media Library"
                subtitle="Manage, optimize, and organize your storefront assets."
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                       <label style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Max Size (MB):</label>
                       <input 
                           type="number" 
                           min="1"
                           value={inputSizeMB}
                           onChange={(e) => setInputSizeMB(Number(e.target.value))}
                           style={{ width: '70px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }}
                       />
                       <button 
                           className="btn-filter-dark" 
                           onClick={() => {
                               setActiveMaxImageSizeMB(inputSizeMB);
                               toast?.success?.(`Max image size set to ${inputSizeMB}MB`);
                           }}
                           style={{ padding: '8px 12px', fontSize: '13px', border: 'none' }}
                       >
                           Set
                       </button>
                   </div>
                   <input type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={(e) => handleUpload(e, false)} />
                   <input type="file" ref={folderInputRef} webkitdirectory="true" directory="true" multiple style={{ display: 'none' }} onChange={(e) => handleUpload(e, true)} />
                   <button className="btn-filter-dark" style={{ padding: '10px 18px', background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={() => folderInputRef.current.click()} disabled={uploading}>
                       {uploading ? <Loader style={{ display: 'inline', width: 14, height: 14 }} /> : <FaFolderPlus className="mr-2 inline" />}
                       Upload Folder
                   </button>
                   <button className="btn-filter-dark" style={{ padding: '10px 18px', background: '#000', color: '#fff', border: 'none' }} onClick={() => fileInputRef.current.click()} disabled={uploading}>
                       {uploading ? <Loader style={{ display: 'inline', width: 14, height: 14 }} /> : <FaPlusCircle className="mr-2 inline" />}
                       Upload Files
                   </button>
                </div>
            </PageHeader>

            {/* Top Media Library KPI Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📸 Total Images</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                        {mediaStats.totalImages}
                    </div>
                    <span style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', display: 'block', fontWeight: 600 }}>Active Image Assets</span>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎬 Total Videos</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
                        {mediaStats.totalVideos}
                    </div>
                    <span style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px', display: 'block', fontWeight: 600 }}>Video Showcase Files</span>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>📁 Total Folders</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>
                        {mediaStats.totalFolders}
                    </div>
                    <span style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '2px', display: 'block', fontWeight: 600 }}>Directory Structures</span>
                </div>

                <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💾 Storage Consumed</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
                        {mediaStats.formattedSize}
                    </div>
                    <span style={{ fontSize: '11px', color: '#f59e0b', marginTop: '2px', display: 'block', fontWeight: 600 }}>Total Disk Usage</span>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentFolder !== '/' && !isSearching && (
                    <button className="btn-filter-dark" style={{ padding: '6px 12px', background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={navigateUp}>
                        <FaLevelUpAlt className="mr-2 inline" /> Up
                    </button>
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '6px 12px', borderRadius: 8 }}>
                    Current Path: {currentFolder}
                </span>
            </div>

            <div className="admin-card" style={{ borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>Items ({allItems.length})</h3>
                    <div className="admin-search" style={{ width: 280, background: '#f8fafc', borderRadius: 10 }}>
                        <i className="fas fa-search" style={{ color: '#94a3b8' }}></i>
                        <input 
                            type="text" 
                            placeholder="Search by filename..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </div>
                
                {loading.media ? <Loader message="Accessing library..." /> : 
                 errors.media  ? <ErrorBanner message={errors.media} onRetry={() => refetch.media()} /> : (
                    <>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="admin-table w-full">
                                <thead>
                                    <tr>
                                        <th>File Asset</th>
                                        <th>Format</th>
                                        <th style={{ textAlign: 'center' }}>Usage</th>
                                        <th style={{ textAlign: 'center' }}>File Size</th>
                                        <th style={{ textAlign: 'center' }}>Date Added</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: 60 }}>
                                            <div style={{ opacity: 0.5 }}>
                                                <FaFolderOpen style={{ fontSize: 40, marginBottom: 15, display: 'block', margin: '0 auto' }} />
                                                <p style={{ fontWeight: 600 }}>No items found in this folder.</p>
                                            </div>
                                        </td></tr>
                                    ) : paginatedItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50"
                                             draggable={item.type !== 'folder'}
                                             onDragStart={(e) => {
                                                 if (item.type !== 'folder') {
                                                     e.dataTransfer.setData('text/plain', item.id.toString());
                                                 }
                                             }}
                                             onDragOver={(e) => {
                                                 if (item.type === 'folder') {
                                                     e.preventDefault();
                                                     e.currentTarget.style.background = '#fef3c7';
                                                 }
                                             }}
                                             onDragLeave={(e) => {
                                                 if (item.type === 'folder') {
                                                     e.currentTarget.style.background = '';
                                                 }
                                             }}
                                             onDrop={(e) => {
                                                 if (item.type === 'folder') {
                                                     e.preventDefault();
                                                     e.currentTarget.style.background = '';
                                                     const mediaId = e.dataTransfer.getData('text/plain');
                                                     if (mediaId) {
                                                         handleFileDrop(mediaId, item.name);
                                                     }
                                                 }
                                             }}>
                                             {item.type === 'folder' ? (
                                                 <>
                                                     <td style={{ cursor: 'pointer' }} onClick={() => navigateToPath(item.path)}>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                             <div style={{ width: 44, height: 44, borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                 <FaFolder style={{ color: '#d97706', fontSize: 20 }} />
                                                             </div>
                                                             <div style={{ minWidth: 0 }}>
                                                                 <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{item.name}</span>
                                                                 <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Folder</span>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td>-</td>
                                                     <td style={{ textAlign: 'center' }}>-</td>
                                                     <td style={{ textAlign: 'center' }}>-</td>
                                                     <td style={{ textAlign: 'center' }}>-</td>
                                                     <td className="text-right">
                                                         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                             <button className="btn-icon" style={{ background: '#f1f5f9', color: '#6366f1' }} onClick={(e) => { e.stopPropagation(); setRenameFolderData({ isOpen: true, oldName: item.name, oldPath: item.path, newName: item.name }); }} title="Rename Folder">
                                                                 <FaEdit size={13} />
                                                             </button>
                                                             <button className="btn-icon" style={{ background: '#fef2f2', color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); setDeleteFolderData({ isOpen: true, folderName: item.name, folderPath: item.path }); }} title="Delete Folder">
                                                                 <FaTrashAlt size={13} />
                                                             </button>
                                                         </div>
                                                     </td>
                                                 </>
                                             ) : (() => {
                                                 const f = item;
                                                 return (
                                                 <>
                                                     <td>
                                                         <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                             <div style={{ width: 44, height: 44, borderRadius: 10, background: '#f1f5f9', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                 {f.mimeType?.includes('image') ? (
                                                                     <img src={getFileUrl(f.fileName || f.filePath || f.url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://placehold.co/44x44?text=IMG'; }} />
                                                                 ) : f.mimeType?.includes('video') ? (
                                                                     <i className="fas fa-video" style={{ color: '#6366f1' }}></i>
                                                                 ) : (
                                                                     <i className="fas fa-file" style={{ color: '#94a3b8' }}></i>
                                                                 )}
                                                             </div>
                                                             <div style={{ minWidth: 0 }}>
                                                                 <span style={{ display: 'block', fontWeight: 700, fontSize: 14, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.originalFilename || f.name}</span>
                                                                 <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace', fontWeight: 500 }}>{f.fileName}</span>
                                                             </div>
                                                         </div>
                                                     </td>
                                                     <td>
                                                         <span style={{ 
                                                             fontSize: 10, 
                                                             fontWeight: 800, 
                                                             color: f.mimeType?.includes('video') ? '#0891b2' : '#6366f1', 
                                                             background: f.mimeType?.includes('video') ? '#ecfeff' : '#f5f3ff', 
                                                             padding: '4px 8px', 
                                                             borderRadius: 6,
                                                             border: `1px solid ${f.mimeType?.includes('video') ? '#cffafe' : '#eedeff'}`
                                                         }}>
                                                             {f.extension?.toUpperCase() || f.fileType?.toUpperCase()}
                                                         </span>
                                                     </td>
                                                     <td style={{ textAlign: 'center' }}>
                                                         {(() => {
                                                             const count = Object.values(f._count || {}).reduce((a, b) => a + b, 0);
                                                             if (count > 0) {
                                                                 return (
                                                                     <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', background: '#d1fae5', padding: '4px 8px', borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                                         <FaLink size={10} /> In Use ({count})
                                                                     </span>
                                                                 );
                                                             }
                                                             return <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Unused</span>;
                                                         })()}
                                                     </td>
                                                     <td style={{ textAlign: 'center', fontWeight: 600, fontSize: 13, color: '#475569' }}>{formatSize(f.fileSize)}</td>
                                                     <td style={{ textAlign: 'center', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{f.createdAt ? new Date(f.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</td>
                                                     <td className="text-right">
                                                         <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                             <a href={getFileUrl(f.fileName)} target="_blank" rel="noreferrer" className="btn-icon" style={{ background: '#f1f5f9', color: '#475569' }} title="View Original"><FaExternalLinkAlt size={12} /></a>
                                                             <button className="btn-icon" style={{ background: '#fef2f2', color: '#ef4444' }} onClick={() => confirmDelete(f)} title="Delete"><FaTrashAlt size={12} /></button>
                                                         </div>
                                                     </td>
                                                 </>
                                             )})()}
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </div>

                         {/* Pagination Footer */}
                         {totalPages > 1 && (
                             <div style={{ padding: '20px 24px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                 <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
                                     Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, allItems.length)} of {allItems.length}
                                 </span>
                                 <div style={{ display: 'flex', gap: 6 }}>
                                     <button 
                                         className="btn-filter-dark" 
                                         style={{ padding: '6px 12px', fontSize: 12, background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }} 
                                         disabled={currentPage === 1}
                                         onClick={() => setCurrentPage(prev => prev - 1)}
                                     >
                                         Previous
                                     </button>
                                     {[...Array(totalPages)].map((_, i) => (
                                         <button 
                                             key={i}
                                             className="btn-filter-dark"
                                             style={{ 
                                                 padding: '6px 12px', minWidth: 36, fontSize: 12,
                                                 background: currentPage === i + 1 ? '#000' : '#fff',
                                                 color: currentPage === i + 1 ? '#fff' : '#475569',
                                                 border: currentPage === i + 1 ? 'none' : '1px solid #e2e8f0'
                                             }}
                                             onClick={() => setCurrentPage(i + 1)}
                                         >
                                             {i + 1}
                                         </button>
                                     ))}
                                     <button 
                                         className="btn-filter-dark" 
                                         style={{ padding: '6px 12px', fontSize: 12, background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }} 
                                         disabled={currentPage === totalPages}
                                         onClick={() => setCurrentPage(prev => prev - 1)}
                                     >
                                         Next
                                     </button>
                                 </div>
                             </div>
                         )}
                     </>
                  )}
             </div>

             {/* Delete File Confirmation Modal */}
             <AdminModal
                 isOpen={deleteModal}
                 onClose={() => !isDeleting && setDeleteModal(false)}
                 title="Confirm Deletion"
                 maxWidth={420}
             >
                 <div style={{ textAlign: 'center', padding: '10px 0' }}>
                     <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
                         <FaExclamationTriangle size={24} />
                     </div>
                     <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#1e293b' }}>Are you absolutely sure?</h3>
                     <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                         This will permanently delete <strong style={{ color: '#1e293b' }}>{fileToDelete?.originalFilename || fileToDelete?.fileName}</strong> and remove the file from the server. This action cannot be undone.
                     </p>

                     {fileToDelete && (() => {
                         const count = Object.values(fileToDelete._count || {}).reduce((a, b) => a + b, 0);
                         if (count > 0) {
                             return (
                                 <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, marginBottom: 20, textAlign: 'left', display: 'flex', gap: 10, color: '#b45309', fontSize: 13 }}>
                                     <FaExclamationTriangle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                                     <div>
                                         <strong style={{ display: 'block', marginBottom: 2 }}>Warning: Linked Asset</strong>
                                         This file is currently linked in {count} places (products, categories, etc). Forcefully deleting it will break those storefront references.
                                     </div>
                                 </div>
                             );
                         }
                         return null;
                     })()}

                     <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                         <button className="btn-filter-dark" style={{ background: '#f1f5f9', color: '#475569', border: 'none', flex: 1 }} onClick={() => setDeleteModal(false)} disabled={isDeleting}>Cancel</button>
                         <button className="btn-filter-dark" style={{ background: '#ef4444', color: '#fff', border: 'none', flex: 1 }} onClick={handleDelete} disabled={isDeleting}>
                             {isDeleting ? 'Deleting...' : 'Delete Forcefully'}
                         </button>
                     </div>
                 </div>
             </AdminModal>

             {/* Rename Folder Modal */}
             <AdminModal
                 isOpen={renameFolderData.isOpen}
                 onClose={() => setRenameFolderData(prev => ({ ...prev, isOpen: false }))}
                 title="Rename Folder"
                 maxWidth={400}
             >
                 <form onSubmit={executeRenameFolder} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                     <div className="form-group">
                         <label style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8, display: 'block' }}>Folder Name</label>
                         <input 
                             type="text" 
                             style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, outline: 'none' }}
                             value={renameFolderData.newName}
                             onChange={(e) => setRenameFolderData(prev => ({ ...prev, newName: e.target.value }))}
                             required
                         />
                     </div>
                     <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                         <button type="button" className="btn-filter-dark" style={{ background: '#f1f5f9', color: '#475569', border: 'none' }} onClick={() => setRenameFolderData(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                         <button type="submit" className="btn-filter-dark" style={{ background: '#000', color: '#fff' }}>Rename Folder</button>
                     </div>
                 </form>
             </AdminModal>

             {/* Delete Folder Modal */}
             <AdminModal
                 isOpen={deleteFolderData.isOpen}
                 onClose={() => setDeleteFolderData(prev => ({ ...prev, isOpen: false }))}
                 title="Delete Folder"
                 maxWidth={400}
             >
                 <div style={{ textAlign: 'center', padding: '10px 0' }}>
                     <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 20px' }}>
                         <FaExclamationTriangle size={24} />
                     </div>
                     <h3 style={{ fontWeight: 800, fontSize: 16, marginBottom: 8, color: '#1e293b' }}>Delete Folder Permanently?</h3>
                     <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, marginBottom: 20 }}>
                         Are you sure you want to delete the folder <strong style={{ color: '#1e293b' }}>{deleteFolderData.folderName}</strong> and all of its contents? This action cannot be undone.
                     </p>
                     <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 16 }}>
                         <button type="button" className="btn-filter-dark" style={{ background: '#f1f5f9', color: '#475569', border: 'none', flex: 1 }} onClick={() => setDeleteFolderData(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                         <button type="button" className="btn-filter-dark" style={{ background: '#ef4444', color: '#fff', border: 'none', flex: 1 }} onClick={executeDeleteFolder}>Delete All</button>
                     </div>
                 </div>
             </AdminModal>
         </div>
     );
 };
 
 export default MediaList;
