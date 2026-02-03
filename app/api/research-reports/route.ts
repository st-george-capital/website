import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const ticker = searchParams.get('ticker');

    const where: any = {};
    if (status) where.status = status;
    if (ticker) where.ticker = ticker;

    const reports = await prisma.equityResearchReport.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        dcfModel: true,
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error('Error fetching research reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch research reports' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await req.json();

    const {
      companyName,
      ticker,
      exchange,
      sector,
      industry,
      coverageStatus,
      recommendation,
      currentPrice,
      targetPrice,
      currency,
      dcfModelId,
    } = data;

    if (!companyName || !ticker || !exchange || !sector || !industry) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const impliedUpside = currentPrice > 0 ? (targetPrice - currentPrice) / currentPrice : 0;

    const report = await prisma.equityResearchReport.create({
      data: {
        companyName,
        ticker,
        exchange,
        sector,
        industry,
        coverageStatus: coverageStatus || 'initiation',
        recommendation: recommendation || 'hold',
        currentPrice: currentPrice || 0,
        targetPrice: targetPrice || 0,
        impliedUpside,
        currency: currency || 'USD',
        createdBy: session.user.id,
        analysts: data.analysts || [session.user.name || session.user.email],
        dcfModelId: dcfModelId || null,
        investmentThesis: data.investmentThesis || [],
        financialSnapshot: data.financialSnapshot || {},
        businessModel: data.businessModel || '',
        industryAnalysis: data.industryAnalysis || '',
        catalystsNearTerm: data.catalystsNearTerm || [],
        catalystsMediumTerm: data.catalystsMediumTerm || [],
        forecastAssumptions: data.forecastAssumptions || {},
        incomeStatementForecast: data.incomeStatementForecast || {},
        cashFlowForecast: data.cashFlowForecast || {},
        valuationMethod: data.valuationMethod || 'dcf',
        valuationAnalysis: data.valuationAnalysis || '',
        sensitivityAnalysis: data.sensitivityAnalysis || {},
        bearCase: data.bearCase || '',
        bullCase: data.bullCase || null,
        bullBearJustification: data.bullBearJustification || null,
        aiStrategies: data.aiStrategies || null,
        keyRisks: data.keyRisks || [],
        esgFactors: data.esgFactors || null,
        dcfInputs: data.dcfInputs || null,
        dcfOutputs: data.dcfOutputs || null,
        showOnWebsite: data.showOnWebsite !== false,
        collaborators: [],
        priceDate: data.priceDate || null,
        fiftyTwoWeekRange: data.fiftyTwoWeekRange || null,
        marketCap: data.marketCap != null ? data.marketCap : null,
        sharesOutstanding: data.sharesOutstanding != null ? data.sharesOutstanding : null,
        fiscalYearEnd: data.fiscalYearEnd || null,
        priceTargetEndDate: data.priceTargetEndDate || null,
        performanceMetrics: data.performanceMetrics || null,
        epsTableMarkdown: data.epsTableMarkdown || null,
        dataSource: data.dataSource || null,
        timeHorizon: data.timeHorizon || '12 months',
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error creating research report:', error);
    return NextResponse.json(
      { error: 'Failed to create research report' },
      { status: 500 }
    );
  }
}
