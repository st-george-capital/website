import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getApiTicker } from '@/lib/exchange';
import { getCashBalance } from '@/lib/cash';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const ticker = searchParams.get('ticker');

    const where = ticker ? { ticker: ticker.toUpperCase() } : {};

    const [trades, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          holding: { select: { ticker: true, assetType: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      trades,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get trades error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const {
      ticker: rawTicker,
      action,
      quantity: rawQuantity,
      price: rawPrice,
      date,
      exchange: rawExchange,
      assetType,
      sector,
      region,
      strategyTag,
      notes,
    } = body;

    // Validation
    const ticker = rawTicker?.toUpperCase()?.trim();
    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }
    if (!['BUY', 'SELL'].includes(action)) {
      return NextResponse.json({ error: 'Action must be BUY or SELL' }, { status: 400 });
    }
    const quantity = parseFloat(rawQuantity);
    const price = parseFloat(rawPrice);
    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be positive' }, { status: 400 });
    }
    if (!price || price <= 0) {
      return NextResponse.json({ error: 'Price must be positive' }, { status: 400 });
    }

    const exchange = rawExchange || 'US';
    const totalCost = quantity * price;
    const tradeDate = date ? new Date(date) : new Date();

    // Get current state
    const { cashBalance } = await getCashBalance();
    const existingHolding = await prisma.holding.findUnique({
      where: { ticker },
    });

    const positionBefore = existingHolding?.quantity || 0;
    const avgCostBefore = existingHolding?.costBasis || 0;

    if (action === 'BUY') {
      // Validate sufficient cash
      if (totalCost > cashBalance) {
        return NextResponse.json(
          {
            error: `Insufficient cash. Available: $${cashBalance.toFixed(2)}, Required: $${totalCost.toFixed(2)}`,
          },
          { status: 400 }
        );
      }

      const apiTicker = getApiTicker(ticker, exchange);
      const positionAfter = positionBefore + quantity;

      // Compute new weighted average cost
      const oldTotalCost = positionBefore * avgCostBefore;
      const newTotalCost = oldTotalCost + totalCost;
      const newAvgCost = positionAfter > 0 ? newTotalCost / positionAfter : price;

      // Execute in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Upsert holding
        const holding = await tx.holding.upsert({
          where: { ticker },
          update: {
            quantity: positionAfter,
            costBasis: newAvgCost,
            apiTicker: exchange !== 'US' ? apiTicker : undefined,
            exchange,
          },
          create: {
            ticker,
            apiTicker: exchange !== 'US' ? apiTicker : null,
            exchange,
            assetType: assetType || 'Equity',
            quantity,
            costBasis: price,
            entryDate: tradeDate,
            sector: sector || null,
            region: region || null,
            strategyTag: strategyTag || null,
          },
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            holdingId: holding.id,
            ticker,
            type: 'BUY',
            quantity,
            price,
            exchange,
            date: tradeDate,
            notes: notes || null,
            positionBefore,
            positionAfter,
            cashBefore: cashBalance,
            cashAfter: cashBalance - totalCost,
            avgCostAtTrade: avgCostBefore || price,
          },
        });

        return { holding, transaction };
      });

      return NextResponse.json(result, { status: 201 });
    }

    if (action === 'SELL') {
      // Validate holding exists with sufficient shares
      if (!existingHolding) {
        return NextResponse.json(
          { error: `No holding found for ${ticker}` },
          { status: 400 }
        );
      }
      if (existingHolding.quantity < quantity) {
        return NextResponse.json(
          {
            error: `Insufficient shares. Available: ${existingHolding.quantity}, Requested: ${quantity}`,
          },
          { status: 400 }
        );
      }

      const positionAfter = positionBefore - quantity;
      const realizedPnL = (price - avgCostBefore) * quantity;

      const result = await prisma.$transaction(async (tx) => {
        let holding;
        if (positionAfter <= 0) {
          // Fully sold - delete holding
          holding = await tx.holding.delete({
            where: { ticker },
          });
        } else {
          // Partially sold - update quantity (cost basis stays the same)
          holding = await tx.holding.update({
            where: { ticker },
            data: { quantity: positionAfter },
          });
        }

        const transaction = await tx.transaction.create({
          data: {
            holdingId: positionAfter > 0 ? holding.id : null,
            ticker,
            type: 'SELL',
            quantity,
            price,
            exchange,
            date: tradeDate,
            notes: notes || null,
            positionBefore,
            positionAfter,
            cashBefore: cashBalance,
            cashAfter: cashBalance + totalCost,
            realizedPnL,
            avgCostAtTrade: avgCostBefore,
          },
        });

        return { holding, transaction, realizedPnL };
      });

      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Trade execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute trade' },
      { status: 500 }
    );
  }
}
