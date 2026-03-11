import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Seed realistic backdated portfolio trades
// Starting cash: $100,000

interface Trade {
  ticker: string;
  exchange: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  date: string; // ISO date
  sector?: string;
  region?: string;
  notes?: string;
}

const trades: Trade[] = [
  // Jan 15, 2025 — Initial positions
  { ticker: 'AAPL', exchange: 'US', action: 'BUY', quantity: 50, price: 185.50, date: '2025-01-15', sector: 'Technology', region: 'US', notes: 'Core tech position' },
  { ticker: 'MSFT', exchange: 'US', action: 'BUY', quantity: 30, price: 390.00, date: '2025-01-15', sector: 'Technology', region: 'US', notes: 'Cloud/AI exposure' },
  { ticker: 'JPM', exchange: 'US', action: 'BUY', quantity: 40, price: 195.20, date: '2025-01-16', sector: 'Financials', region: 'US', notes: 'Banking sector play' },

  // Feb 3, 2025 — Add more positions
  { ticker: 'NVDA', exchange: 'US', action: 'BUY', quantity: 25, price: 620.00, date: '2025-02-03', sector: 'Technology', region: 'US', notes: 'AI/semiconductor thesis' },
  { ticker: 'RY', exchange: 'TRT', action: 'BUY', quantity: 60, price: 145.80, date: '2025-02-03', sector: 'Financials', region: 'Canada', notes: 'Canadian bank diversification' },

  // Mar 10, 2025 — Add a defensive position
  { ticker: 'JNJ', exchange: 'US', action: 'BUY', quantity: 35, price: 155.40, date: '2025-03-10', sector: 'Healthcare', region: 'US', notes: 'Defensive healthcare' },

  // Apr 1, 2025 — Trim AAPL for profit, add energy
  { ticker: 'AAPL', exchange: 'US', action: 'SELL', quantity: 20, price: 210.30, date: '2025-04-01', notes: 'Taking partial profits' },
  { ticker: 'XOM', exchange: 'US', action: 'BUY', quantity: 45, price: 112.50, date: '2025-04-02', sector: 'Energy', region: 'US', notes: 'Energy sector value play' },

  // May 15, 2025 — Add UK exposure
  { ticker: 'SHEL', exchange: 'LON', action: 'BUY', quantity: 80, price: 27.50, date: '2025-05-15', sector: 'Energy', region: 'UK', notes: 'International energy diversification' },

  // Jul 2025 — Add to NVDA on pullback
  { ticker: 'NVDA', exchange: 'US', action: 'BUY', quantity: 10, price: 580.00, date: '2025-07-10', notes: 'Adding on pullback' },

  // Sep 2025 — Sell JNJ, rotate into AMZN
  { ticker: 'JNJ', exchange: 'US', action: 'SELL', quantity: 35, price: 162.80, date: '2025-09-15', notes: 'Rotating out of healthcare' },
  { ticker: 'AMZN', exchange: 'US', action: 'BUY', quantity: 30, price: 188.50, date: '2025-09-16', sector: 'Technology', region: 'US', notes: 'E-commerce + AWS growth' },

  // Nov 2025 — Add TSX Venture position
  { ticker: 'LI', exchange: 'TRV', action: 'BUY', quantity: 500, price: 2.85, date: '2025-11-01', sector: 'Mining', region: 'Canada', notes: 'Lithium exploration play' },
];

async function seed() {
  console.log('Clearing existing portfolio data...');
  await prisma.transaction.deleteMany();
  await prisma.holding.deleteMany();

  // Ensure initial cash setting exists
  await prisma.settings.upsert({
    where: { key: 'initialCash' },
    update: {},
    create: { key: 'initialCash', value: '100000' },
  });

  let cashBalance = 100000;
  const holdings: Record<string, { quantity: number; costBasis: number; id?: string }> = {};

  console.log('Executing trades...\n');

  for (const trade of trades) {
    const totalCost = trade.quantity * trade.price;
    const positionBefore = holdings[trade.ticker]?.quantity || 0;
    const avgCostBefore = holdings[trade.ticker]?.costBasis || 0;

    if (trade.action === 'BUY') {
      if (totalCost > cashBalance) {
        console.log(`  SKIP ${trade.ticker} BUY — insufficient cash ($${cashBalance.toFixed(2)} < $${totalCost.toFixed(2)})`);
        continue;
      }

      const oldTotalCost = positionBefore * avgCostBefore;
      const positionAfter = positionBefore + trade.quantity;
      const newAvgCost = (oldTotalCost + totalCost) / positionAfter;
      const cashAfter = cashBalance - totalCost;

      const apiTicker = trade.exchange !== 'US' ? `${trade.ticker}.${trade.exchange}` : null;

      const holding = await prisma.holding.upsert({
        where: { ticker: trade.ticker },
        update: {
          quantity: positionAfter,
          costBasis: newAvgCost,
        },
        create: {
          ticker: trade.ticker,
          apiTicker,
          exchange: trade.exchange,
          assetType: 'Equity',
          quantity: trade.quantity,
          costBasis: trade.price,
          entryDate: new Date(trade.date),
          sector: trade.sector || null,
          region: trade.region || null,
        },
      });

      await prisma.transaction.create({
        data: {
          holdingId: holding.id,
          ticker: trade.ticker,
          type: 'BUY',
          quantity: trade.quantity,
          price: trade.price,
          exchange: trade.exchange,
          date: new Date(trade.date),
          notes: trade.notes || null,
          positionBefore,
          positionAfter,
          cashBefore: cashBalance,
          cashAfter,
          avgCostAtTrade: avgCostBefore || trade.price,
        },
      });

      holdings[trade.ticker] = { quantity: positionAfter, costBasis: newAvgCost, id: holding.id };
      cashBalance = cashAfter;

      console.log(`  ${trade.date} BUY  ${trade.quantity} ${trade.ticker} @ $${trade.price} = -$${totalCost.toFixed(2)}  |  Cash: $${cashBalance.toFixed(2)}`);

    } else if (trade.action === 'SELL') {
      if (!holdings[trade.ticker] || holdings[trade.ticker].quantity < trade.quantity) {
        console.log(`  SKIP ${trade.ticker} SELL — insufficient shares`);
        continue;
      }

      const positionAfter = positionBefore - trade.quantity;
      const realizedPnL = (trade.price - avgCostBefore) * trade.quantity;
      const cashAfter = cashBalance + totalCost;

      if (positionAfter <= 0) {
        await prisma.transaction.create({
          data: {
            holdingId: null,
            ticker: trade.ticker,
            type: 'SELL',
            quantity: trade.quantity,
            price: trade.price,
            exchange: trade.exchange,
            date: new Date(trade.date),
            notes: trade.notes || null,
            positionBefore,
            positionAfter: 0,
            cashBefore: cashBalance,
            cashAfter,
            realizedPnL,
            avgCostAtTrade: avgCostBefore,
          },
        });
        await prisma.holding.delete({ where: { ticker: trade.ticker } });
        delete holdings[trade.ticker];
      } else {
        const holding = await prisma.holding.update({
          where: { ticker: trade.ticker },
          data: { quantity: positionAfter },
        });
        await prisma.transaction.create({
          data: {
            holdingId: holding.id,
            ticker: trade.ticker,
            type: 'SELL',
            quantity: trade.quantity,
            price: trade.price,
            exchange: trade.exchange,
            date: new Date(trade.date),
            notes: trade.notes || null,
            positionBefore,
            positionAfter,
            cashBefore: cashBalance,
            cashAfter,
            realizedPnL,
            avgCostAtTrade: avgCostBefore,
          },
        });
        holdings[trade.ticker] = { ...holdings[trade.ticker], quantity: positionAfter };
      }

      cashBalance = cashAfter;
      const pnlSign = realizedPnL >= 0 ? '+' : '';
      console.log(`  ${trade.date} SELL ${trade.quantity} ${trade.ticker} @ $${trade.price} = +$${totalCost.toFixed(2)}  |  P&L: ${pnlSign}$${realizedPnL.toFixed(2)}  |  Cash: $${cashBalance.toFixed(2)}`);
    }
  }

  // Summary
  const remainingHoldings = Object.entries(holdings);
  console.log('\n--- Portfolio Summary ---');
  console.log(`Cash: $${cashBalance.toFixed(2)}`);
  console.log(`Positions: ${remainingHoldings.length}`);
  for (const [ticker, h] of remainingHoldings) {
    console.log(`  ${ticker}: ${h.quantity} shares @ $${h.costBasis.toFixed(2)} avg`);
  }
  console.log('Done!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
