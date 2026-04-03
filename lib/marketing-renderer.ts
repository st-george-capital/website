import { spawn } from 'node:child_process';
import path from 'node:path';
import { put } from '@vercel/blob';
import type { Page } from 'puppeteer-core';
import { launchPdfBrowser } from '@/lib/pdf/browser';
import {
  applyMarketingOverrides,
  buildCaptionPack,
  resolveCampaignTitle,
  type MarketingCaptionPack,
  type MarketingOverrideFields,
  type MarketingSourceSnapshot,
} from '@/lib/marketing';
import type { MarketingAssetKind, MarketingPlatform } from '@/lib/marketing-types';

interface PythonRenderResponse {
  instagramHtml: string;
  linkedinHtml: string;
  pdfHtml: string | null;
}

interface StoredMarketingAsset {
  platform: MarketingPlatform;
  assetKind: MarketingAssetKind;
  mimeType: string;
  blobUrl: string;
  width?: number;
  height?: number;
  ordering: number;
}

function sanitizeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset';
}

function runPythonScript(payload: Record<string, unknown>) {
  const scriptPath = path.join(process.cwd(), 'scripts', 'marketing_renderer', 'render_marketing.py');
  const candidates = [process.env.PYTHON_EXECUTABLE_PATH, 'python3', 'python'].filter(Boolean) as string[];

  return new Promise<PythonRenderResponse>((resolve, reject) => {
    let lastError: Error | null = null;

    const runCandidate = (index: number) => {
      if (index >= candidates.length) {
        reject(lastError || new Error('Unable to locate a Python interpreter for marketing rendering.'));
        return;
      }

      const child = spawn(candidates[index], [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) => {
        lastError = error;
        runCandidate(index + 1);
      });

      child.on('close', (code) => {
        if (code !== 0) {
          lastError = new Error(stderr.trim() || `Marketing renderer exited with code ${code}`);
          runCandidate(index + 1);
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(`Failed to parse marketing renderer output: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    };

    runCandidate(0);
  });
}

async function preparePage(page: Page, html: string, width: number, height: number) {
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(async () => {
    // @ts-ignore
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
}

async function uploadBinaryAsset(params: {
  pathname: string;
  buffer: Buffer;
  contentType: string;
}) {
  const blob = await put(params.pathname, params.buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: params.contentType,
  });

  return blob.url;
}

async function uploadTextAsset(params: {
  pathname: string;
  text: string;
}) {
  const blob = await put(params.pathname, params.text, {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'text/plain; charset=utf-8',
  });

  return blob.url;
}

export async function renderAndStoreMarketingPack(params: {
  campaignId: string;
  snapshot: MarketingSourceSnapshot;
  overrides?: MarketingOverrideFields | null;
  captions?: MarketingCaptionPack | null;
  origin: string;
}) {
  const finalSnapshot = applyMarketingOverrides(params.snapshot, params.overrides);
  const captions = params.captions || buildCaptionPack(finalSnapshot);
  const rendererPayload = {
    snapshot: finalSnapshot,
    brand: {
      logoUrl: `${params.origin}/images/logo/sgc_logo.png`,
    },
  };

  const rendered = await runPythonScript(rendererPayload);
  const browser = await launchPdfBrowser();
  const titleSlug = sanitizeSegment(resolveCampaignTitle(finalSnapshot));
  const basePath = `marketing/${params.campaignId}/${titleSlug}`;

  try {
    const assets: StoredMarketingAsset[] = [];

    const instagramPage = await browser.newPage();
    await preparePage(instagramPage, rendered.instagramHtml, 1080, 1350);
    const instagramBuffer = Buffer.from(await instagramPage.screenshot({ type: 'png' }) as Uint8Array);
    await instagramPage.close();
    assets.push({
      platform: 'instagram',
      assetKind: 'feed',
      mimeType: 'image/png',
      blobUrl: await uploadBinaryAsset({
        pathname: `${basePath}-instagram.png`,
        buffer: instagramBuffer,
        contentType: 'image/png',
      }),
      width: 1080,
      height: 1350,
      ordering: 0,
    });

    const linkedinPage = await browser.newPage();
    await preparePage(linkedinPage, rendered.linkedinHtml, 1200, 627);
    const linkedinBuffer = Buffer.from(await linkedinPage.screenshot({ type: 'png' }) as Uint8Array);
    await linkedinPage.close();
    assets.push({
      platform: 'linkedin',
      assetKind: 'feed',
      mimeType: 'image/png',
      blobUrl: await uploadBinaryAsset({
        pathname: `${basePath}-linkedin.png`,
        buffer: linkedinBuffer,
        contentType: 'image/png',
      }),
      width: 1200,
      height: 627,
      ordering: 0,
    });

    const instagramCaptionUrl = await uploadTextAsset({
      pathname: `${basePath}-instagram-caption.txt`,
      text: captions.instagram,
    });
    assets.push({
      platform: 'instagram',
      assetKind: 'caption',
      mimeType: 'text/plain',
      blobUrl: instagramCaptionUrl,
      ordering: 1,
    });

    const linkedinCaptionUrl = await uploadTextAsset({
      pathname: `${basePath}-linkedin-caption.txt`,
      text: captions.linkedin,
    });
    assets.push({
      platform: 'linkedin',
      assetKind: 'caption',
      mimeType: 'text/plain',
      blobUrl: linkedinCaptionUrl,
      ordering: 1,
    });

    if (rendered.pdfHtml) {
      const pdfPage = await browser.newPage();
      await preparePage(pdfPage, rendered.pdfHtml, 1100, 1556);
      const pdfBuffer = Buffer.from(
        await pdfPage.pdf({
          format: 'Letter',
          printBackground: true,
          margin: {
            top: '0.35in',
            right: '0.35in',
            bottom: '0.35in',
            left: '0.35in',
          },
        })
      );
      await pdfPage.close();

      assets.push({
        platform: 'pdf',
        assetKind: 'flyer',
        mimeType: 'application/pdf',
        blobUrl: await uploadBinaryAsset({
          pathname: `${basePath}-flyer.pdf`,
          buffer: pdfBuffer,
          contentType: 'application/pdf',
        }),
        ordering: 0,
      });
    }

    return {
      snapshot: finalSnapshot,
      captions,
      assets,
    };
  } finally {
    await browser.close();
  }
}
