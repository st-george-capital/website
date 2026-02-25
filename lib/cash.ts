import { prisma } from '@/lib/prisma';

const DEFAULT_INITIAL_CASH = 100000;

export async function getCashBalance(): Promise<{ cashBalance: number; initialCash: number }> {
  const initialCashSetting = await prisma.settings.findUnique({
    where: { key: 'initialCash' },
  });
  const initialCash = initialCashSetting
    ? parseFloat(initialCashSetting.value)
    : DEFAULT_INITIAL_CASH;

  const lastTransaction = await prisma.transaction.findFirst({
    orderBy: { date: 'desc' },
    select: { cashAfter: true },
  });

  const cashBalance = lastTransaction ? lastTransaction.cashAfter : initialCash;

  return { cashBalance, initialCash };
}
