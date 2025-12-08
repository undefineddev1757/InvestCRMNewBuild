import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Получаем IP адрес из заголовков
    const forwarded = request.headers.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(',')[0] : "127.0.0.1"
    
    // Используем бесплатный API для определения страны
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch geo data')
    }
    
    const data = await response.json()
    
    // Маппинг кодов стран к телефонным кодам
    const countryToPhoneCode: { [key: string]: string } = {
      'RU': '+7',   // Россия
      'UA': '+380', // Украина
      'US': '+1',   // США
      'GB': '+44',  // Великобритания
      'DE': '+49',  // Германия
      'FR': '+33',  // Франция
      'IT': '+39',  // Италия
      'ES': '+34',  // Испания
      'PL': '+48',  // Польша
      'CA': '+1',   // Канада
      'AU': '+61',  // Австралия
      'JP': '+81',  // Япония
      'CN': '+86',  // Китай
      'IN': '+91',  // Индия
      'BR': '+55',  // Бразилия
      'MX': '+52',  // Мексика
      'AR': '+54',  // Аргентина
      'TR': '+90',  // Турция
      'NL': '+31',  // Нидерланды
      'BE': '+32',  // Бельгия
      'CH': '+41',  // Швейцария
      'AT': '+43',  // Австрия
      'SE': '+46',  // Швеция
      'NO': '+47',  // Норвегия
      'DK': '+45',  // Дания
      'FI': '+358', // Финляндия
      'IE': '+353', // Ирландия
      'PT': '+351', // Португалия
      'GR': '+30',  // Греция
      'CZ': '+420', // Чехия
      'HU': '+36',  // Венгрия
      'RO': '+40',  // Румыния
      'BG': '+359', // Болгария
      'HR': '+385', // Хорватия
      'SI': '+386', // Словения
      'SK': '+421', // Словакия
      'LT': '+370', // Литва
      'LV': '+371', // Латвия
      'EE': '+372', // Эстония
      'LU': '+352', // Люксембург
      'MT': '+356', // Мальта
      'CY': '+357', // Кипр
    }
    
    const phoneCode = countryToPhoneCode[data.countryCode] || '+7' // По умолчанию Россия
    
    return NextResponse.json({
      countryCode: data.countryCode,
      country: data.country,
      phoneCode: phoneCode
    })
  } catch (error) {
    console.error('Geo API error:', error)
    // Возвращаем Россию по умолчанию
    return NextResponse.json({
      countryCode: 'RU',
      country: 'Russia',
      phoneCode: '+7'
    })
  }
}
