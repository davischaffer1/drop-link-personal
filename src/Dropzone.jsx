// src/Dropzone.jsx
import { useRef, useState } from 'react';

export default function Dropzone({ onDrop, disabled }) {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = (files) => {
    if (disabled || !files || files.length === 0) return;
    onDrop(Array.from(files));
  };

  const onDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const onDropEvent = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const onClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const onInputChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDropEvent}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
        ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-indigo-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={onInputChange}
        className="hidden"
      />
      <div className="text-gray-500">
        <p className="text-lg font-medium">
          {disabled
            ? 'Aguardando conexão...'
            : isDragActive
            ? 'Solte os arquivos aqui'
            : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-sm mt-1">
          Você pode enviar vários arquivos de uma vez.
        </p>
      </div>
    </div>
  );
}
