import React, { useState, useRef, useCallback, ChangeEvent, useMemo } from 'react';
import type { GeminiMode, ChatMessage } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import BoltIcon from './icons/BoltIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import PaperAirplaneIcon from './icons/PaperAirplaneIcon';
import PhotoIcon from './icons/PhotoIcon';

interface GeminiPanelProps {
  onGeminiRequest: (prompt: string, mode: GeminiMode) => void;
  onChatRequest: (message: string) => void;
  onScaffoldRequest: (prompt: string) => void;
  onGenerateCodeRequest: (prompt: string) => void;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  uploadedImage: {data: string, mimeType: string} | null;
  setUploadedImage: (image: {data: string, mimeType: string} | null) => void;
  aiResponse: string;
  aiResponseType: 'text' | 'scaffold';
  onApplyEdit: () => void;
  onApplyScaffold: () => void;
}

type PanelView = 'tools' | 'chat';

const GeminiPanel: React.FC<GeminiPanelProps> = ({
  onGeminiRequest,
  onChatRequest,
  onScaffoldRequest,
  onGenerateCodeRequest,
  chatHistory,
  isLoading,
  uploadedImage,
  setUploadedImage,
  aiResponse,
  aiResponseType,
  onApplyEdit,
  onApplyScaffold
}) => {
  const [view, setView] = useState<PanelView>('tools');
  const [prompt, setPrompt] = useState<string>('');
  const [chatMessage, setChatMessage] = useState<string>('');
  const [mode, setMode] = useState<GeminiMode>('low-latency');
  const [activeRequestType, setActiveRequestType] = useState<'edit' | 'scaffold' | 'code' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isScaffoldJson = useMemo(() => {
    if (aiResponseType !== 'scaffold' || !aiResponse) return false;
    try {
      const parsed = JSON.parse(aiResponse);
      return typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.files);
    } catch {
      return false;
    }
  }, [aiResponse, aiResponseType]);

  const handleImageUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = (e.target?.result as string).split(',')[1];
        if (base64String) {
          setUploadedImage({ data: base64String, mimeType: file.type });
        }
      };
      reader.readAsDataURL(file);
    }
  }, [setUploadedImage]);

  const handleToolSubmit = () => {
    if (prompt.trim()) {
      setActiveRequestType('edit');
      onGeminiRequest(prompt, mode);
      setPrompt('');
    }
  };

  const handleScaffoldSubmit = () => {
    if (prompt.trim()) {
      setActiveRequestType('scaffold');
      onScaffoldRequest(prompt);
      setPrompt('');
    }
  }

  const handleGenerateCodeSubmit = () => {
    if (prompt.trim()) {
        setActiveRequestType('code');
        onGenerateCodeRequest(prompt);
        setPrompt('');
    }
  };

  const handleChatSubmit = () => {
    if (chatMessage.trim()) {
      onChatRequest(chatMessage);
      setChatMessage('');
    }
  };

  return (
    <aside className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setView('tools')}
          className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${view === 'tools' ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700/50'}`}
        >
          <SparklesIcon className="w-5 h-5"/> AI Tools
        </button>
        <button
          onClick={() => setView('chat')}
          className={`flex-1 p-3 text-sm font-bold flex items-center justify-center gap-2 ${view === 'chat' ? 'bg-gray-700' : 'bg-gray-800 hover:bg-gray-700/50'}`}
        >
          <ChatBubbleIcon className="w-5 h-5"/> Chat
        </button>
      </div>

      {view === 'tools' && (
        <div className="flex-1 flex flex-col p-4 space-y-4">
            <h3 className="text-lg font-semibold">AI Assistant</h3>
            <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setMode('low-latency')} className={`p-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'low-latency' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <BoltIcon className="w-4 h-4"/> Fast
                </button>
                <button onClick={() => setMode('thinking')} className={`p-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors ${mode === 'thinking' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    <SparklesIcon className="w-4 h-4"/> Deep Think
                </button>
            </div>
            
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={`Ask AI to... (e.g., refactor, generate tests, or scaffold a new project).`}
                className="w-full h-24 p-2 bg-gray-900 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
                <button onClick={handleToolSubmit} disabled={isLoading} className="flex-1 p-2 text-sm bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-gray-600">
                    {isLoading && activeRequestType === 'edit' ? 'Thinking...' : 'Generate Edit'}
                </button>
                 <button onClick={handleGenerateCodeSubmit} disabled={isLoading} className="flex-1 p-2 text-sm bg-teal-600 rounded-md hover:bg-teal-500 disabled:bg-gray-600">
                    {isLoading && activeRequestType === 'code' ? 'Generating...' : 'Generate Code'}
                </button>
                 <button onClick={handleScaffoldSubmit} disabled={isLoading} className="flex-1 p-2 text-sm bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:bg-gray-600">
                    {isLoading && activeRequestType === 'scaffold' ? 'Building...' : 'Scaffold Project'}
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-600 rounded-md hover:bg-gray-500">
                    <PhotoIcon className="w-5 h-5"/>
                </button>
            </div>

            {uploadedImage && (
                <div className="relative">
                    <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} alt="upload preview" className="rounded-md max-h-32" />
                    <button onClick={() => setUploadedImage(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs">X</button>
                </div>
            )}
            
            <div className="flex-1 bg-gray-900 rounded-md p-2 overflow-y-auto min-h-0">
                <pre className="text-xs whitespace-pre-wrap">{aiResponse}</pre>
                {isLoading && !aiResponse && <div className="text-center text-gray-400">Gemini is processing...</div>}
            </div>
            {aiResponse && !isLoading && aiResponseType === 'text' && (
                 <button onClick={onApplyEdit} className="w-full p-2 bg-green-600 rounded-md hover:bg-green-500">Apply as Edit</button>
            )}
            {aiResponse && !isLoading && isScaffoldJson && (
                 <button onClick={onApplyScaffold} className="w-full p-2 bg-green-600 rounded-md hover:bg-green-500">Apply Scaffold</button>
            )}
        </div>
      )}

      {view === 'chat' && (
        <div className="flex-1 flex flex-col p-4 min-h-0">
            <div className="flex-1 space-y-4 overflow-y-auto mb-4 min-h-0">
                {chatHistory.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-xs ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-600'}`}>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && chatHistory.length > 0 && chatHistory[chatHistory.length -1].role === 'user' && (
                     <div className="flex justify-start">
                        <div className="p-3 rounded-lg max-w-xs bg-gray-600">
                            <p className="text-sm animate-pulse">...</p>
                        </div>
                    </div>
                )}
            </div>
            {uploadedImage && (
                <div className="relative mb-2">
                    <img src={`data:${uploadedImage.mimeType};base64,${uploadedImage.data}`} alt="upload preview" className="rounded-md max-h-24" />
                    <button onClick={() => setUploadedImage(null)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs">X</button>
                </div>
            )}
            <div className="flex items-center gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-600 rounded-md hover:bg-gray-500">
                    <PhotoIcon className="w-5 h-5"/>
                </button>
                <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Type a message..."
                    className="flex-1 p-2 bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleChatSubmit} disabled={isLoading} className="p-3 bg-blue-600 rounded-md hover:bg-blue-500 disabled:bg-gray-600">
                    <PaperAirplaneIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>
      )}
      
       <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
       />
    </aside>
  );
};

export default GeminiPanel;
