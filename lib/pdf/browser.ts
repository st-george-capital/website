import fs from 'node:fs';
import chromium from '@sparticuz/chromium';
import puppeteer, { type Browser } from 'puppeteer-core';

const CHROMIUM_PACK_VERSION = 'v143.0.0';
const CHROMIUM_PACK_ARCH = process.arch === 'arm64' ? 'arm64' : 'x64';
const DEFAULT_REMOTE_CHROMIUM_PACK_URL = `https://github.com/Sparticuz/chromium/releases/download/${CHROMIUM_PACK_VERSION}/chromium-${CHROMIUM_PACK_VERSION}-pack.${CHROMIUM_PACK_ARCH}.tar`;

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

let cachedExecutablePath: string | null = null;

async function resolveChromeExecutablePath() {
  if (cachedExecutablePath) {
    return cachedExecutablePath;
  }

  for (const candidate of LOCAL_CHROME_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      cachedExecutablePath = candidate;
      return candidate;
    }
  }

  try {
    const executablePath = await chromium.executablePath();
    cachedExecutablePath = executablePath;
    return executablePath;
  } catch {
    try {
      const remotePackUrl = process.env.CHROMIUM_PACK_URL || DEFAULT_REMOTE_CHROMIUM_PACK_URL;
      const executablePath = await chromium.executablePath(remotePackUrl);
      cachedExecutablePath = executablePath;
      return executablePath;
    } catch {
      return null;
    }
  }
}

export async function launchPdfBrowser(): Promise<Browser> {
  const executablePath = await resolveChromeExecutablePath();

  if (!executablePath) {
    throw new Error('Unable to locate a Chrome/Chromium executable for PDF export.');
  }

  return puppeteer.launch({
    executablePath,
    headless: 'shell',
    args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
    defaultViewport: {
      width: 1440,
      height: 2048,
      deviceScaleFactor: 2,
    },
  });
}
