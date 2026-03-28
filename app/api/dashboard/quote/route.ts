import { NextResponse } from 'next/server';

export const revalidate = 86400; // cache 24h — one quote per day

export async function GET() {
  try {
    const res = await fetch('https://zenquotes.io/api/today', { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`zenquotes ${res.status}`);
    const data: { q: string; a: string }[] = await res.json();
    const item = data?.[0];
    if (!item?.q) throw new Error('empty');
    return NextResponse.json({ quote: item.q, author: item.a });
  } catch {
    return NextResponse.json({
      quote: 'An investment in knowledge pays the best interest.',
      author: 'Benjamin Franklin',
    });
  }
}
