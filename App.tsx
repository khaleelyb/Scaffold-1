import React, { useState, useCallback, useMemo } from 'react';
import Editor from './components/Editor';
import FileExplorer from './components/FileExplorer';
import GeminiPanel from './components/GeminiPanel';
import type { FileItem, GeminiMode, ChatMessage, ScaffoldResponse } from './types';
import { analyzeWithGemini, chatWithGemini, scaffoldWithGemini } from './services/geminiService';

// @ts-ignore
import JSZip from 'jszip';
// @ts-ignore
import saveAs from 'file-saver';


const App: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([
    { id: '1', path: 'welcome.js', content: `// Welcome to Vibe Code!\n// Use the panel on the right to interact with Gemini.\n\nfunction greet() {\n  console.log("Hello, AI-powered world!");\n}` },
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('1');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [uploadedImage, setUploadedImage] = useState<{data: string, mimeType: string} | null>(null);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiResponseType, setAiResponseType] = useState<'text' | 'scaffold'>('text');


  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);
  const activeFileName = useMemo(() => activeFile?.path.split('/').pop(), [activeFile]);

  const handleFileChange = useCallback((newContent: string) => {
    setFiles(prevFiles =>
      prevFiles.map(f => (f.id === activeFileId ? { ...f, content: newContent } : f))
    );
  }, [activeFileId]);

  const handleAddFile = useCallback(() => {
    const filePath = prompt('Enter file path (e.g., src/components/Button.js):');
    if (filePath) {
      const newFile: FileItem = {
        id: Date.now().toString(),
        path: filePath,
        content: `// New file: ${filePath}\n`,
      };
      setFiles(prev => [...prev, newFile]);
      setActiveFileId(newFile.id);
    }
  }, []);
  
  const handleDownloadProject = useCallback(() => {
    const zip = new JSZip();
    files.forEach(file => {
      zip.file(file.path, file.content);
    });
    zip.generateAsync({ type: 'blob' }).then(content => {
      saveAs(content, 'vibe-code-project.zip');
    });
  }, [files]);

  const handleGeminiRequest = useCallback(async (prompt: string, mode: GeminiMode) => {
    if (!activeFile) return;
    setIsLoading(true);
    setAiResponse('');
    setAiResponseType('text');
    try {
      const response = await analyzeWithGemini(prompt, activeFile.content, mode, uploadedImage ?? undefined);
      setAiResponse(response);
    } catch (error) {
      console.error("Gemini API Error:", error);
      setAiResponse(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [activeFile, uploadedImage]);
  
  const handleApplyEdit = useCallback(() => {
    if(aiResponse && activeFileId) {
       handleFileChange(aiResponse);
       setAiResponse('');
    }
  }, [aiResponse, activeFileId, handleFileChange]);

  const handleChatRequest = useCallback(async (message: string) => {
    setIsLoading(true);
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: message }];
    setChatHistory(updatedHistory);
    try {
      const response = await chatWithGemini(updatedHistory, message, uploadedImage ?? undefined);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
      if (uploadedImage) {
        setUploadedImage(null); // Clear image after sending it in chat
      }
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      setChatHistory(prev => [...prev, { role: 'model', text: `Sorry, I encountered an error: ${(error as Error).message}` }]);
    } finally {
      setIsLoading(false);
    }
  }, [chatHistory, uploadedImage]);

  const handleScaffoldRequest = useCallback(async (prompt: string) => {
    setIsLoading(true);
    setAiResponse('');
    setAiResponseType('scaffold');
    try {
        const response = await scaffoldWithGemini(prompt);
        setAiResponse(response);
    } catch (error) {
        console.error("Gemini Scaffold Error:", error);
        setAiResponse(JSON.stringify({ error: `Scaffolding failed: ${(error as Error).message}`}));
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleApplyScaffold = useCallback(() => {
    try {
        const scaffold: ScaffoldResponse = JSON.parse(aiResponse);
        if (!scaffold.files || !Array.isArray(scaffold.files)) {
            throw new Error("Invalid scaffold format.");
        }

        setFiles(prevFiles => {
            const newFilesMap = new Map<string, FileItem>();
            prevFiles.forEach(f => newFilesMap.set(f.path, f));

            scaffold.files.forEach(scaffoldFile => {
                const existingFile = newFilesMap.get(scaffoldFile.path);
                const newFile: FileItem = {
                    id: existingFile ? existingFile.id : `${Date.now()}-${scaffoldFile.path}`,
                    path: scaffoldFile.path,
                    content: scaffoldFile.content,
                };
                newFilesMap.set(scaffoldFile.path, newFile);
            });

            return Array.from(newFilesMap.values());
        });

        setAiResponse('');
    } catch (error) {
        alert(`Error applying scaffold: ${(error as Error).message}`);
    }
  }, [aiResponse]);


  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-mono">
      <FileExplorer
        files={files}
        activeFileId={activeFileId}
        onFileSelect={setActiveFileId}
        onAddFile={handleAddFile}
        onDownloadProject={handleDownloadProject}
      />
      <main className="flex-1 flex flex-col">
        <div className="p-2 border-b border-gray-700 bg-gray-800 text-sm">
          {activeFileName || 'No file selected'}
        </div>
        <Editor
          content={activeFile?.content || ''}
          onChange={handleFileChange}
        />
      </main>
      <GeminiPanel
        onGeminiRequest={handleGeminiRequest}
        onChatRequest={handleChatRequest}
        onScaffoldRequest={handleScaffoldRequest}
        chatHistory={chatHistory}
        isLoading={isLoading}
        uploadedImage={uploadedImage}
        setUploadedImage={setUploadedImage}
        aiResponse={aiResponse}
        aiResponseType={aiResponseType}
        onApplyEdit={handleApplyEdit}
        onApplyScaffold={handleApplyScaffold}
      />
    </div>
  );
};

export default App;
