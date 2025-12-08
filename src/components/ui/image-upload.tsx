"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { Card, CardContent } from './card'
import { Upload, X, User, Loader2 } from 'lucide-react'
import { useLanguage } from '@/contexts/language-context'
import Image from 'next/image'

interface ImageUploadProps {
  currentImage?: string
  onImageChange: (imagePath: string | null) => void
  className?: string
}

export function ImageUpload({ currentImage, onImageChange, className }: ImageUploadProps) {
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
        setError(result.error || 'Failed to upload image')
        setPreview(currentImage || null) // Возвращаем к исходному изображению
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError('Failed to upload image')
      setPreview(currentImage || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    onImageChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setError(null) // Очищаем ошибки при удалении
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={className}>
      <Card className="relative z-[60]">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Preview Area */}
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
              {preview ? (
                <>
                  <Image
                    src={preview}
                    alt="Profile preview"
                    fill
                    className="object-cover"
                  />
                  {!uploading && (
                    <button
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-110 border-2 border-white"
                      title="Remove photo"
                    >
                      <X size={12} />
                    </button>
                  )}
                </>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={handleClick}
                >
                  <User size={32} className="text-gray-400" />
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Loader2 size={24} className="text-white animate-spin" />
                </div>
              )}
            </div>

            {/* Upload Button */}
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
                  <span>{preview ? t('common.changePhoto') : t('common.uploadPhoto')}</span>
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
