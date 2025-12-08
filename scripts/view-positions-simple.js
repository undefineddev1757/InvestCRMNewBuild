const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function viewPositionsSimple() {
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
    console.log('='.repeat(80))
    
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
        
        const pnlColor = pnl >= 0 ? '🟢' : '🔴'
        const statusEmoji = pos.status === 'OPEN' ? '🟡' : pos.status === 'CLOSED' ? '✅' : '❓'
        
        console.log(`   ${index + 1}. ${statusEmoji} ${pos.symbol.name || pos.symbolId}`)
        console.log(`      ID: ${pos.id}`)
        console.log(`      Направление: ${pos.side === 'LONG' ? '📈 Long' : '📉 Short'}`)
        console.log(`      Объем: ${pos.qty}`)
        console.log(`      Цена входа: $${pos.entryPrice}`)
        console.log(`      Цена выхода: ${pos.exitPrice ? `$${pos.exitPrice}` : '—'}`)
        console.log(`      Плечо: ${pos.leverage}x`)
        console.log(`      PnL: ${pnlColor} $${pnl.toFixed(2)}`)
        console.log(`      Создана: ${new Date(pos.createdAt).toLocaleString('ru-RU')}`)
        if (pos.closedAt) {
          console.log(`      Закрыта: ${new Date(pos.closedAt).toLocaleString('ru-RU')}`)
        }
        
        // Для открытых позиций показываем дополнительную информацию
        if (pos.status === 'OPEN') {
          console.log(`      ⚠️  ОТКРЫТАЯ ПОЗИЦИЯ - PnL может отличаться от текущего`)
          console.log(`      💡 Для актуального PnL нужно получить текущую цену ${pos.symbolId}`)
        }
        
        console.log('')
      }
    }

    // Общая статистика
    console.log('\n' + '='.repeat(80))
    console.log('📈 ОБЩАЯ СТАТИСТИКА:')
    
    const openPositions = positions.filter(p => p.status === 'OPEN')
    const closedPositions = positions.filter(p => p.status === 'CLOSED')
    const totalPnl = positions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0)
    const realizedPnl = closedPositions.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0)
    
    console.log(`   Всего сделок: ${positions.length}`)
    console.log(`   Открытых: ${openPositions.length}`)
    console.log(`   Закрытых: ${closedPositions.length}`)
    console.log(`   Уникальных клиентов: ${Object.keys(positionsByClient).length}`)
    console.log(`   Общий PnL (из БД): ${totalPnl >= 0 ? '🟢' : '🔴'} $${totalPnl.toFixed(2)}`)
    console.log(`   Реализованный PnL: ${realizedPnl >= 0 ? '🟢' : '🔴'} $${realizedPnl.toFixed(2)}`)
    
    // Детали по открытым позициям
    if (openPositions.length > 0) {
      console.log('\n🟡 ОТКРЫТЫЕ ПОЗИЦИИ:')
      openPositions.forEach((pos, index) => {
        console.log(`   ${index + 1}. ${pos.symbol.name || pos.symbolId} - ${pos.side} ${pos.qty} @ $${pos.entryPrice}`)
        console.log(`      ID: ${pos.id}`)
        console.log(`      Создана: ${new Date(pos.createdAt).toLocaleString('ru-RU')}`)
        console.log(`      PnL в БД: $${(Number(pos.pnl) || 0).toFixed(2)} (может быть устаревшим)`)
        console.log('')
      })
    }
    
    // Топ активных клиентов
    console.log('\n🏆 ТОП АКТИВНЫХ КЛИЕНТОВ:')
    const clientStats = Object.entries(positionsByClient).map(([email, pos]) => ({
      email,
      name: pos[0].tradingAccount.client.name || 'Без имени',
      count: pos.length,
      totalPnl: pos.reduce((sum, p) => sum + (Number(p.pnl) || 0), 0),
      openCount: pos.filter(p => p.status === 'OPEN').length
    })).sort((a, b) => b.count - a.count)
    
    clientStats.slice(0, 5).forEach((client, index) => {
      console.log(`   ${index + 1}. ${client.name} (${client.email})`)
      console.log(`      Сделок: ${client.count} (открытых: ${client.openCount})`)
      console.log(`      PnL: $${client.totalPnl.toFixed(2)}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Ошибка при загрузке сделок:', error)
  } finally {
    await prisma.$disconnect()
  }
}

viewPositionsSimple()
