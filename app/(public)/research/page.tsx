import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

const prisma = new PrismaClient();

async function getPublishedReports() {
  const reports = await prisma.equityResearchReport.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
  });

  return reports;
}

export default async function ResearchIndexPage() {
  const reports = await getPublishedReports();

  const getRecommendationColor = (rec: string) => {
    switch (rec.toLowerCase()) {
      case 'buy': return 'bg-green-600 text-white';
      case 'sell': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-[#030116]">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">
            Equity Research
          </h1>
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Institutional-grade equity research reports from St. George Capital
          </p>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/60 text-lg">No published research reports yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={`/research/${report.ticker}`}
                className="group block bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {report.companyName}
                      </h3>
                      <div className="text-sm text-gray-600 mt-1">
                        {report.ticker} • {report.exchange}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRecommendationColor(report.recommendation)}`}>
                      {report.recommendation.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
                    <div>
                      <div className="text-xs text-gray-500">Target Price</div>
                      <div className="text-xl font-bold text-gray-900">
                        ${report.targetPrice.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Upside</div>
                      <div className={`text-xl font-bold flex items-center ${report.impliedUpside >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {report.impliedUpside >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                        {(report.impliedUpside * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    {report.sector} • {report.industry}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      {new Date(report.reportDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-blue-600 font-medium text-sm group-hover:translate-x-1 transition-transform">
                      Read Report
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
