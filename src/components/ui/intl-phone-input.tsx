"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface IntlPhoneInputProps {
  value?: string
  onChange?: (value: string | undefined) => void
  placeholder?: string
  className?: string
  defaultCountry?: string
  disabled?: boolean
  name?: string
}

const IntlPhoneInput = React.forwardRef<HTMLInputElement, IntlPhoneInputProps>(
  ({ className, value, onChange, placeholder, defaultCountry = "UA", disabled, name = "phone", ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const itiRef = React.useRef<any>(null)
    const [isLoaded, setIsLoaded] = React.useState(false)

    React.useImperativeHandle(ref, () => inputRef.current!)

    React.useEffect(() => {
      // Завантажуємо скрипт тільки один раз
      if (typeof window !== 'undefined' && !window.intlTelInput) {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/intlTelInput.min.js'
        script.onload = () => {
          setIsLoaded(true)
        }
        document.head.appendChild(script)
      } else if (window.intlTelInput) {
        setIsLoaded(true)
      }
    }, [])

    React.useEffect(() => {
      if (isLoaded && inputRef.current && !itiRef.current) {
        itiRef.current = window.intlTelInput(inputRef.current, {
          initialCountry: defaultCountry,
          hiddenInput: "full_number",
          utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.1.1/build/js/utils.js',
          separateDialCode: true,
          formatOnSubmit: true,
          placeholderNumberType: "MOBILE",
          autoPlaceholder: "aggressive"
        })

        // Додаємо обробники подій
        inputRef.current.addEventListener('countrychange', () => {
          if (onChange && itiRef.current) {
            const fullNumber = itiRef.current.getNumber()
            onChange(fullNumber)
          }
        })

        inputRef.current.addEventListener('input', () => {
          if (onChange && itiRef.current) {
            const fullNumber = itiRef.current.getNumber()
            onChange(fullNumber)
          }
        })

        // Зберігаємо поточну країну при зміні
        inputRef.current.addEventListener('countrychange', () => {
          if (itiRef.current) {
            const selectedCountry = itiRef.current.getSelectedCountryData()
            // Можна додати логіку для збереження вибраної країни
            console.log('Selected country:', selectedCountry.iso2)
          }
        })

        // Встановлюємо початкове значення, якщо воно є
        if (value) {
          itiRef.current.setNumber(value)
        }
      }

      return () => {
        if (itiRef.current) {
          itiRef.current.destroy()
          itiRef.current = null
        }
      }
    }, [isLoaded, defaultCountry]) // Видаляємо onChange з залежностей

    // Оновлюємо значення при зміні value prop
    React.useEffect(() => {
      if (itiRef.current && value !== undefined) {
        itiRef.current.setNumber(value)
      }
    }, [value])

    return (
      <div className={cn("relative flex", className)}>
        <input
          ref={inputRef}
          type="tel"
          name={name}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    )
  }
)

IntlPhoneInput.displayName = "IntlPhoneInput"

export { IntlPhoneInput }
