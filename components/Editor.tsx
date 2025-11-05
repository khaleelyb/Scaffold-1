
import React from 'react';

interface EditorProps {
  content: string;
  onChange: (newContent: string) => void;
}

const Editor: React.FC<EditorProps> = ({ content, onChange }) => {
  return (
    <div className="flex-1 bg-[#1e1e1e] overflow-auto">
      <textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        className="w-full h-full p-4 bg-transparent text-gray-300 resize-none focus:outline-none leading-relaxed font-mono text-sm"
        spellCheck="false"
      />
    </div>
  );
};

export default Editor;