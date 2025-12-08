"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent } from './card'
import { Upload, X, FileImage, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface DocumentUploadProps {
  currentImage?: string
  onImageChange: (imagePath: string | null) => void
  className?: string
  title?: string
  description?: string
  disabled?: boolean // Блокировка загрузки/удаления
  blurred?: boolean // Замыливание изображения
  showBlurText?: boolean // Показывать ли текст поверх blur
}

export function DocumentUpload({ currentImage, onImageChange, className, title, description, disabled = false, blurred = false, showBlurText = false }: DocumentUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  // Обновляем preview когда currentImage изменяется
  useEffect(() => {
    setPreview(currentImage || null)
  }, [currentImage])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return // Блокируем если disabled
    
    const file = event.target.files?.[0]
    if (!file) return

    // Создаем превью
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Загружаем файл
    await uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        onImageChange(result.filePath)
      } else {
        setError(result.error || 'Failed to upload document')
        setPreview(currentImage || null) // Возвращаем к исходному изображению
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload document')
      setPreview(currentImage || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    if (disabled) return // Блокируем удаление если disabled
    
    setPreview(null)
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null) // Очищаем ошибки при удалении
  }

  const handleClick = () => {
    if (disabled) return // Блокируем клик если disabled
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <Card className="relative z-[60]">
        <CardContent className="p-4">
          <div className="flex flex-col items-center space-y-4">
            {title && (
              <h3 className="text-lg font-medium text-center">{title}</h3>
            )}
            
            {description && (
              <p className="text-sm text-muted-foreground text-center">{description}</p>
            )}

            {/* Preview Area - Rectangle for documents */}
            <div className={`relative w-full aspect-[3/2] max-w-sm rounded-lg overflow-hidden border-2 border-dashed transition-colors ${
              disabled ? 'border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
            }`}>
              {preview ? (
                <>
                  <Image
                    src={preview}
                    alt="Document preview"
                    fill
                    className={`object-cover ${blurred ? 'blur-md' : ''}`}
                  />
                  {blurred && showBlurText && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="bg-white/90 px-4 py-2 rounded-lg shadow-lg">
                        <p className="text-sm font-medium text-gray-800">Документ на проверке</p>
                      </div>
                    </div>
                  )}
                  {!uploading && !disabled && (
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 border-2 border-white"
                      title="Remove document"
                    >
                      <X size={12} />
                    </button>
                  )}
                </>
              ) : (
                <div 
                  className={`w-full h-full flex flex-col items-center justify-center bg-gray-50 transition-colors ${
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-gray-100'
                  }`}
                  onClick={handleClick}
                >
                  <FileImage size={32} className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">{t('common.uploadDocumentPlaceholder')}</p>
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Upload Button - скрываем для PENDING и APPROVED */}
            {!disabled && (
              <div className="flex flex-col items-center space-y-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClick}
                    disabled={uploading}
                    className="flex items-center space-x-2"
                  >
                    <Upload size={16} />
                    <span>{preview ? t('common.changeDocument') : t('common.uploadDocument')}</span>
                  </Button>
                  
                  {preview && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRemoveImage}
                      disabled={uploading}
                      className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <X size={16} />
                      <span>{t('common.remove')}</span>
                    </Button>
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  {t('common.photoHint')}
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>
    </div>
  )
}

