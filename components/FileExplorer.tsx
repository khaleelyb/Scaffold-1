import React, { useMemo, useState, useRef, ChangeEvent } from 'react';
import type { FileItem } from '../types';
import FolderIcon from './icons/FolderIcon';
import FileIcon from './icons/FileIcon';
import DownloadIcon from './icons/DownloadIcon';
import PlusIcon from './icons/PlusIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import FolderPlusIcon from './icons/FolderPlusIcon';


interface FileExplorerProps {
  files: FileItem[];
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
  onAddFile: () => void;
  onAddFiles: (files: { path: string, content: string }[]) => void;
  onDownloadProject: () => void;
}

interface TreeNode {
  name: string;
  item?: FileItem;
  children?: Record<string, TreeNode>;
}

const buildFileTree = (files: FileItem[]): Record<string, TreeNode> => {
  const root: Record<string, TreeNode> = {};

  files.forEach(file => {
    const parts = file.path.split('/');
    let currentNode = root;

    parts.forEach((part, index) => {
      if (!currentNode[part]) {
        currentNode[part] = { name: part };
      }

      if (index === parts.length - 1) {
        currentNode[part].item = file;
      } else {
        if (!currentNode[part].children) {
          currentNode[part].children = {};
        }
        currentNode = currentNode[part].children!;
      }
    });
  });

  return root;
};

const Tree: React.FC<{
    nodes: Record<string, TreeNode>;
    level?: number;
    activeFileId: string | null;
    onFileSelect: (id: string) => void;
}> = ({ nodes, level = 0, activeFileId, onFileSelect }) => {
    const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});

    const toggleFolder = (name: string) => {
        setOpenFolders(prev => ({...prev, [name]: !prev[name]}));
    };

    // Fix: Explicitly cast Object.values to TreeNode[] to ensure correct type inference for sortedNodes.
    const sortedNodes = (Object.values(nodes) as TreeNode[]).sort((a, b) => {
        if (a.children && !b.children) return -1; // folders first
        if (!a.children && b.children) return 1;
        return a.name.localeCompare(b.name); // then sort by name
    });

    return (
        <ul style={{ paddingLeft: level > 0 ? '1rem' : 0 }}>
            {sortedNodes.map(node => (
                <li key={node.name}>
                    {node.children ? (
                        <div>
                            <div onClick={() => toggleFolder(node.name)} className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-gray-700">
                                <ChevronRightIcon className={`w-4 h-4 mr-2 text-gray-400 transition-transform ${openFolders[node.name] ? 'rotate-90' : ''}`} />
                                <FolderIcon className="w-4 h-4 mr-2 text-blue-400" />
                                {node.name}
                            </div>
                            {openFolders[node.name] && <Tree nodes={node.children} level={level + 1} activeFileId={activeFileId} onFileSelect={onFileSelect} />}
                        </div>
                    ) : (
                        <div onClick={() => onFileSelect(node.item!.id)}
                            className={`flex items-center pl-10 pr-4 py-2 text-sm cursor-pointer hover:bg-gray-700 ${activeFileId === node.item!.id ? 'bg-blue-900/50 text-white' : ''}`}>
                            <FileIcon className="w-4 h-4 mr-3 text-gray-400" />
                            {node.name}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  activeFileId,
  onFileSelect,
  onAddFile,
  onAddFiles,
  onDownloadProject,
}) => {
  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderUploadClick = () => {
    folderInputRef.current?.click();
  };

  const handleFolderInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return;
    }

    const filePromises = Array.from(uploadedFiles).map(file => {
      return new Promise<{ path: string, content: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          // @ts-ignore
          const path = file.webkitRelativePath;
          if (path) {
            resolve({ path, content });
          } else {
            reject(new Error(`Could not determine path for file: ${file.name}`));
          }
        };
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    });

    try {
      const newFiles = await Promise.all(filePromises);
      onAddFiles(newFiles);
    } catch (error) {
      console.error("Error reading uploaded folder:", error);
      alert("There was an error processing the uploaded folder.");
    }
    
    if(event.target) {
        event.target.value = '';
    }
  };

  return (
    <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center">
            <FolderIcon className="w-6 h-6 mr-2 text-blue-400" />
            <h2 className="text-lg font-bold">Vibe Code</h2>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Tree nodes={fileTree} activeFileId={activeFileId} onFileSelect={onFileSelect} />
      </div>
      <div className="p-2 border-t border-gray-700 space-y-2">
         <div className="grid grid-cols-2 gap-2">
            <button
            onClick={onAddFile}
            className="w-full flex items-center justify-center px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded-md transition-colors"
            >
                <PlusIcon className="w-4 h-4 mr-2" />
                New File
            </button>
            <button
                onClick={handleFolderUploadClick}
                className="w-full flex items-center justify-center px-4 py-2 text-sm bg-green-600 hover:bg-green-500 rounded-md transition-colors"
            >
                <FolderPlusIcon className="w-4 h-4 mr-2" />
                Upload
            </button>
        </div>
        <button
          onClick={onDownloadProject}
          className="w-full flex items-center justify-center px-4 py-2 text-sm bg-gray-600 hover:bg-gray-500 rounded-md transition-colors"
        >
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download Project
        </button>
        <input
          type="file"
          ref={folderInputRef}
          onChange={handleFolderInputChange}
          className="hidden"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
        />
      </div>
    </aside>
  );
};

export default FileExplorer;