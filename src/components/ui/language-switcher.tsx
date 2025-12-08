"use client"

import { useLanguage } from "@/contexts/language-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const languages = [
  { code: 'en', name: 'EN' },
  { code: 'ru', name: 'RU' },
  { code: 'de', name: 'DE' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as 'en' | 'ru' | 'de')}>
      <SelectTrigger className="w-[64px] h-8 text-sm border-0 bg-transparent hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 px-0 py-0 justify-center">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{lang.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
