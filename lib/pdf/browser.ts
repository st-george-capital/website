import fs from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser } from 'puppeteer-core';

const LOCAL_CHROME_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean) as string[];

async function resolveChromeExecutablePath() {
  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return await chromium.executablePath();
  } catch {
    return null;
  }
}

export async function launchPdfBrowser(): Promise<Browser> {
  const executablePath = await resolveChromeExecutablePath();

  if (!executablePath) {
    throw new Error('Unable to locate a Chrome/Chromium executable for PDF export.');
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: chromium.args,
    defaultViewport: {
      width: 1440,
      height: 2048,
      deviceScaleFactor: 2,
    },
  });
}
