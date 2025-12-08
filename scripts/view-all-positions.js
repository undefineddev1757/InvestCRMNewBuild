const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Функция для расчета PnL
function calculatePnl(side, entryPrice, currentPrice, qty) {
  const entry = Number(entryPrice)
  const current = Number(currentPrice)
  const quantity = Number(qty)
  
  if (side === 'LONG') {
    return (current - entry) * quantity
  } else {
    return (entry - current) * quantity
  }
}

// Функция для получения текущей цены
async function getCurrentPrice(symbolId) {
  try {
    const response = await fetch(`http://localhost:3000/api/v1/prices/${encodeURIComponent(symbolId)}`)
    if (response.ok) {
      const data = await response.json()
      return Number(data?.mark ?? data?.last ?? 0)
    }
  } catch (error) {
    console.log(`Не удалось получить цену для ${symbolId}`)
  }
  return null
}

async function viewAllPositions() {
  try {
    console.log('🔍 Загружаем все сделки клиентов...\n')
    
    // Получаем все позиции с связанными данными
    const positions = await prisma.position.findMany({
      include: {
        tradingAccount: {
          include: {
            client: true
          }
        },
        symbol: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (positions.length === 0) {
      console.log('❌ Сделок не найдено')
      return
    }

    console.log(`📊 Найдено сделок: ${positions.length}\n`)
    console.log('=' * 80)
    
    // Группируем по клиентам
    const positionsByClient = {}
    positions.forEach(pos => {
      const clientEmail = pos.tradingAccount.client.email
      if (!positionsByClient[clientEmail]) {
        positionsByClient[clientEmail] = []
      }
      positionsByClient[clientEmail].push(pos)
    })

    // Выводим по клиентам
    for (const [clientEmail, clientPositions] of Object.entries(positionsByClient)) {
      const client = clientPositions[0].tradingAccount.client
      console.log(`\n👤 КЛИЕНТ: ${client.name || 'Без имени'} (${clientEmail})`)
      console.log(`   ID: ${client.id}`)
      console.log(`   Статус: ${client.isActive ? '✅ Активен' : '❌ Неактивен'}`)
      console.log(`   Уровень доступа: ${client.accessLevel}`)
      console.log(`   Последняя активность: ${client.lastSeen ? new Date(client.lastSeen).toLocaleString('ru-RU') : 'Никогда'}`)
      console.log(`   Сделок: ${clientPositions.length}`)
      console.log('   ' + '-'.repeat(60))
      
      for (let index = 0; index < clientPositions.length; index++) {
        const pos = clientPositions[index]
        let pnl = pos.pnl ? Number(pos.pnl) : 0
        let currentPrice = null
        
        // Для открытых позиций получаем текущую цену и рассчитываем PnL
        if (pos.status === 'OPEN') {
          currentPrice = await getCurrentPrice(pos.symbolId)
          if (currentPrice) {
            pnl = calculatePnl(pos.side, pos.entryPrice, currentPrice, pos.qty)
          }
        }
        
        const pnlColor = pnl >= 0 ? '🟢' : '🔴'
        const statusEmoji = pos.status === 'OPEN' ? '🟡' : pos.status === 'CLOSED' ? '✅' : '❓'
        
        console.log(`   ${index + 1}. ${statusEmoji} ${pos.symbol.name || pos.symbolId}`)
        console.log(`      ID: ${pos.id}`)
        console.log(`      Направление: ${pos.side === 'LONG' ? '📈 Long' : '📉 Short'}`)
        console.log(`      Объем: ${pos.qty}`)
        console.log(`      Цена входа: $${pos.entryPrice}`)
        if (currentPrice) {
          console.log(`      Текущая цена: $${currentPrice.toFixed(2)}`)
        }
        console.log(`      Цена выхода: ${pos.exitPrice ? `$${pos.exitPrice}` : '—'}`)
        console.log(`      Плечо: ${pos.leverage}x`)
        console.log(`      PnL: ${pnlColor} $${pnl.toFixed(2)}`)
        console.log(`      Создана: ${new Date(pos.createdAt).toLocaleString('ru-RU')}`)
        if (pos.closedAt) {
          console.log(`      Закрыта: ${new Date(pos.closedAt).toLocaleString('ru-RU')}`)
        }
        console.log('')
      }
    }

    // Общая статистика
    console.log('\n' + '=' * 80)
    console.log('📈 ОБЩАЯ СТАТИСТИКА:')
    
    const openPositions = positions.filter(p => p.status === 'OPEN')
    const closedPositions = positions.filter(p => p.status === 'CLOSED')
    const totalPnl = positions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0)
    const realizedPnl = closedPositions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0)
    
    console.log(`   Всего сделок: ${positions.length}`)
    console.log(`   Открытых: ${openPositions.length}`)
    console.log(`   Закрытых: ${closedPositions.length}`)
    console.log(`   Уникальных клиентов: ${Object.keys(positionsByClient).length}`)
    console.log(`   Общий PnL: ${totalPnl >= 0 ? '🟢' : '🔴'} $${totalPnl.toFixed(2)}`)
    console.log(`   Реализованный PnL: ${realizedPnl >= 0 ? '🟢' : '🔴'} $${realizedPnl.toFixed(2)}`)
    
    // Топ активных клиентов
    console.log('\n🏆 ТОП АКТИВНЫХ КЛИЕНТОВ:')
    const clientStats = Object.entries(positionsByClient).map(([email, pos]) => ({
      email,
      name: pos[0].tradingAccount.client.name || 'Без имени',
      count: pos.length,
      totalPnl: pos.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0)
    })).sort((a, b) => b.count - a.count)
    
    clientStats.slice(0, 5).forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} (${client.email}) - ${client.count} сделок, PnL: $${client.totalPnl.toFixed(2)}`)
    })

  } catch (error) {
    console.error('❌ Ошибка при загрузке сделок:', error)
  } finally {
    await prisma.$disconnect()
  }
}

viewAllPositions()
