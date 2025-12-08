"use client"

import * as React from "react"
import PhoneInput from "react-phone-number-input"
import { cn } from "@/lib/utils"
import "react-phone-number-input/style.css"

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string | undefined) => void
  placeholder?: string
  className?: string
  defaultCountry?: string
  disabled?: boolean
}

const PhoneInputComponent = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, placeholder, defaultCountry = "UA", disabled, ...props }, ref) => {
    return (
      <div className={cn("relative flex", className)}>
        <PhoneInput
          value={value}
          onChange={onChange as any}
          defaultCountry={defaultCountry as any}
          placeholder={placeholder}
          disabled={disabled}
          className="flex w-full"
          style={{
            '--PhoneInputCountryFlag-height': '1.2em',
            '--PhoneInputCountryFlag-width': '1.5em',
            '--PhoneInput-color--focus': 'transparent',
            '--PhoneInputCountrySelectArrow-color': 'hsl(var(--muted-foreground))',
            '--PhoneInputCountrySelectArrow-color--focus': 'hsl(var(--foreground))',
            '--PhoneInputCountryFlag-border': 'none',
            '--PhoneInputCountryFlag-borderRadius': '2px',
          } as React.CSSProperties}
          inputComponent={({ className: inputClassName, ...inputProps }) => (
            <input
              {...inputProps}
              className={cn(
                "flex h-10 w-full items-center rounded-r-md border-l-0 border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                inputClassName
              )}
            />
          )}
          countrySelectComponent={({ className: countryClassName, iconComponent, ...countryProps }) => (
            <div
              {...countryProps}
              className={cn(
                "flex h-10 items-center rounded-l-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-w-[120px] cursor-pointer",
                countryClassName
              )}
            />
          )}
          {...props}
        />
      </div>
    )
  }
)
PhoneInputComponent.displayName = "PhoneInput"

export { PhoneInputComponent as PhoneInput }
