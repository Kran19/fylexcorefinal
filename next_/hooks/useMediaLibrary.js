import { useState, useMemo, useCallback, useEffect } from 'react';

/**
 * useMediaLibrary
 * Centralizes the virtual folder logic, filtering, and searching for the media system.
 * 
 * @param {Array} rawMedia - Array of media objects from the backend
 * @param {Object} options - Configuration options (e.g. { excludeVideos: true, onlyImages: false })
 */
export const useMediaLibrary = (rawMedia = [], options = {}) => {
    const [currentFolder, setCurrentFolder] = useState('/');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name_asc, size_desc

    // Reset page or search if folder changes, though page isn't here
    useEffect(() => {
        setSearchTerm('');
    }, [currentFolder]);

    const navigateToFolder = useCallback((folderName) => {
        setCurrentFolder(prev => prev === '/' ? '/' + folderName : prev + '/' + folderName);
    }, []);

    const navigateUp = useCallback(() => {
        setCurrentFolder(prev => {
            if (prev === '/') return '/';
            const parts = prev.split('/');
            parts.pop();
            return parts.join('/') || '/';
        });
    }, []);

    const navigateToPath = useCallback((path) => {
        setCurrentFolder(path || '/');
    }, []);

    const sortedMedia = useMemo(() => {
        const sorted = [...rawMedia];
        switch (sortBy) {
            case 'oldest':
                sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'name_asc':
                sorted.sort((a, b) => (a.originalFilename || a.fileName || '').localeCompare(b.originalFilename || b.fileName || ''));
                break;
            case 'size_desc':
                sorted.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
        }
        return sorted;
    }, [rawMedia, sortBy]);

    const { allItems, currentPathFiles, currentPathFolders } = useMemo(() => {
        // 1. Filter out videos if requested
        let filtered = sortedMedia.filter(f => {
            if (options.excludeVideos) {
                const isVideo = f.mimeType?.includes('video') || f.fileType === 'video' || f.extension === 'mp4' || f.extension === 'webm';
                if (isVideo) return false;
            }
            if (options.onlyImages) {
                if (!f.mimeType?.includes('image')) return false;
            }
            return true;
        });

        const isSearching = searchTerm.trim().length > 0;
        
        // 2. If searching, we flatten the view and ignore folders
        if (isSearching) {
            const term = searchTerm.toLowerCase();
            const searchResults = filtered.filter(f => 
                (f.originalFilename || f.name || '').toLowerCase().includes(term) ||
                (f.fileName || '').toLowerCase().includes(term)
            );
            return {
                allItems: searchResults.map(f => ({ type: 'file', ...f })),
                currentPathFiles: searchResults,
                currentPathFolders: []
            };
        }

        // 3. Normal folder navigation
        const files = [];
        const folders = new Set();

        filtered.forEach(f => {
            const folder = f.folderPath || '/';
            
            if (folder === currentFolder || folder === currentFolder.replace(/\/$/, '')) {
                files.push(f);
            } else if (folder.startsWith(currentFolder === '/' ? '/' : currentFolder + '/')) {
                let relativePath = folder.substring(currentFolder === '/' ? 1 : currentFolder.length + 1);
                if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
                
                const immediateSubFolder = relativePath.split('/')[0];
                if (immediateSubFolder) {
                    folders.add(immediateSubFolder);
                }
            }
        });

        const foldersArray = Array.from(folders).sort();
        const items = [
            ...foldersArray.map(name => ({ type: 'folder', name, id: `folder-${name}`, path: currentFolder === '/' ? `/${name}` : `${currentFolder}/${name}` })),
            ...files.map(f => ({ type: 'file', ...f }))
        ];

        return {
            allItems: items,
            currentPathFiles: files,
            currentPathFolders: foldersArray
        };
    }, [sortedMedia, currentFolder, searchTerm, options.excludeVideos, options.onlyImages]);

    return {
        currentFolder,
        searchTerm,
        setSearchTerm,
        sortBy,
        setSortBy,
        navigateToFolder,
        navigateUp,
        navigateToPath,
        allItems,
        currentPathFiles,
        currentPathFolders,
        isSearching: searchTerm.trim().length > 0
    };
};
