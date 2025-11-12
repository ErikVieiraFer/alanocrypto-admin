import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

const ImageUpload = ({ currentImage, onImageSelect, onImageRemove }) => {
  const [preview, setPreview] = useState(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  /**
   * Valida o arquivo de imagem
   */
  const validateFile = (file) => {
    // Validar tipo
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Apenas imagens JPG, JPEG, PNG ou WEBP são permitidas';
    }

    // Validar tamanho
    if (file.size > MAX_SIZE) {
      return 'Imagem deve ter no máximo 5MB';
    }

    return null;
  };

  /**
   * Processa o arquivo selecionado
   */
  const handleFile = (file) => {
    if (!file) return;

    // Validar arquivo
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Limpar erro anterior
    setError(null);

    // Criar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Notificar componente pai
    if (onImageSelect) {
      onImageSelect(file);
    }
  };

  /**
   * Handler para input file
   */
  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  /**
   * Handler para drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  /**
   * Handler para drag leave
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  /**
   * Handler para drop
   */
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  /**
   * Handler para remover imagem
   */
  const handleRemove = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onImageRemove) {
      onImageRemove();
    }
  };

  /**
   * Handler para abrir seletor de arquivo
   */
  const handleChooseFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="w-full">
      {preview ? (
        // Preview da imagem
        <div className="relative w-full">
          <div className="relative w-full h-[300px] bg-gray-800 rounded-lg overflow-hidden">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
          {/* Botão remover */}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition-colors shadow-lg"
            title="Remover imagem"
          >
            <X size={20} />
          </button>
        </div>
      ) : (
        // Área de upload
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full h-[300px] border-2 border-dashed rounded-lg
            flex flex-col items-center justify-center
            cursor-pointer transition-colors
            ${
              isDragging
                ? 'border-green-500 bg-green-500 bg-opacity-10'
                : 'border-gray-600 bg-gray-800 hover:border-green-500 hover:bg-gray-750'
            }
          `}
          onClick={handleChooseFile}
        >
          <Upload
            size={48}
            className={`mb-4 ${isDragging ? 'text-green-500' : 'text-gray-400'}`}
          />
          <p className="text-gray-300 text-center mb-2">
            {isDragging ? 'Solte a imagem aqui' : 'Arraste uma imagem ou clique para escolher'}
          </p>
          <p className="text-gray-500 text-sm text-center">
            JPG, JPEG, PNG ou WEBP (máx. 5MB)
          </p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              handleChooseFile();
            }}
          >
            Escolher Arquivo
          </button>
        </div>
      )}

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Mensagem de erro */}
      {error && (
        <div className="mt-2 p-3 bg-red-900 bg-opacity-50 border border-red-600 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
