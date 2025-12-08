import { useState } from 'react'

export interface ValidationErrors {
  [key: string]: string
}

export function useValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({})

  const validateEmail = (email: string): string | null => {
    if (!email) return 'validation.emailRequired'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'validation.invalidEmail'
    return null
  }

  const validatePassword = (password: string): string | null => {
    if (!password) return 'validation.passwordRequired'
    if (password.length < 6) return 'validation.passwordTooShort'
    if (password.length > 50) return 'validation.passwordTooLong'
    return null
  }

  const validateName = (name: string): string | null => {
    if (!name) return 'validation.nameRequired'
    if (name.length < 2) return 'validation.nameTooShort'
    if (name.length > 50) return 'validation.nameTooLong'
    return null
  }

  const validatePhone = (phone: string): string | null => {
    if (!phone) return 'validation.phoneRequired'
    // Базова перевірка формату телефону
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) return 'validation.invalidPhoneFormat'
    return null
  }

  const validateField = (field: string, value: string): string | null => {
    switch (field) {
      case 'email':
        return validateEmail(value)
      case 'password':
        return validatePassword(value)
      case 'name':
      case 'surname':
        return validateName(value)
      case 'phone':
        return validatePhone(value)
      default:
        return null
    }
  }

  const setFieldError = (field: string, error: string | null) => {
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }))
  }

  const clearErrors = () => {
    setErrors({})
  }

  const hasErrors = Object.values(errors).some(error => error !== '')

  return {
    errors,
    validateField,
    setFieldError,
    clearErrors,
    hasErrors
  }
}
