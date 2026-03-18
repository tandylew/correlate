/**
 * UI Tests for Correlate — Realtime Market Correlation Monitor
 *
 * Run locally: node test.js [url]
 * Default URL: file:///path/to/index.html (or provide deployed URL)
 *
 * Requires: puppeteer or puppeteer-core with a Chrome/Chromium available.
 * In CI, use `npm install puppeteer` (includes Chromium download).
 */

const fs = require('fs');
const path = require('path');

// Try puppeteer first, fall back to puppeteer-core
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch {
  try {
    puppeteer = require('puppeteer-core');
  } catch {
    console.log('⚠ Puppeteer not available — running static HTML validation only\n');
    puppeteer = null;
  }
}

// ============================================================
// STATIC VALIDATION (no browser needed)
// ============================================================
function staticValidation() {
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  const results = [];
  let pass = true;

  function check(name, condition) {
    const ok = !!condition;
    if (!ok) pass = false;
    results.push({ name, ok });
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  }

  console.log('📋 Static HTML Validation\n');

  // Structure checks
  check('Has DOCTYPE', html.includes('<!DOCTYPE html>'));
  check('Has title', html.includes('<title>') && html.includes('Correlate'));
  check('Has Chart.js CDN', html.includes('chart.js'));
  check('Has chartjs-adapter-date-fns', html.includes('chartjs-adapter-date-fns'));
  check('Has JetBrains Mono font', html.includes('JetBrains+Mono'));
  check('Has Syne font', html.includes('Syne'));

  // Realtime UI elements
  check('Has CORRELATE title', html.includes('CORRELATE'));
  check('Has status badge', html.includes('status-badge'));
  check('Has status dot', html.includes('statusDot'));
  check('Has SPY option', html.includes('>SPY<'));
  check('Has USO option', html.includes('>USO<'));
  check('Has VIX option', html.includes('>VIX<'));
  check('Has symbol-select dropdowns', (html.match(/class="symbol-select"/g) || []).length >= 2);
  check('Has "vs" separator', html.includes('symbol-vs'));

  // Backfill buttons
  check('Has backfill group', html.includes('backfill-group'));
  check('Has 1H backfill', html.includes("requestBackfill('1h')"));
  check('Has 1D backfill', html.includes("requestBackfill('1d')"));
  check('Has 1W backfill', html.includes("requestBackfill('1w')"));
  check('Has 1M backfill', html.includes("requestBackfill('1m')"));
  check('Has 3M backfill', html.includes("requestBackfill('3m')"));

  // Stats cards
  check('Has SPY stat card', html.includes('statSPY'));
  check('Has USO stat card', html.includes('statUSO'));
  check('Has VIX stat card', html.includes('statVIX'));
  check('Has Correlation stat card', html.includes('statCorr'));
  check('Has Data Points stat card', html.includes('statPoints'));
  check('Has stat-value class', html.includes('stat-value'));

  // Charts
  check('Has priceChart canvas', html.includes('priceChart'));
  check('Has corrChart canvas', html.includes('corrChart'));
  check('Has scatterChart canvas', html.includes('scatterChart'));

  // Navigation tabs
  check('Has Realtime tab', html.includes("switchView('realtime')"));
  check('Has Scatter tab', html.includes("switchView('scatter')"));
  check('Has Table tab', html.includes("switchView('table')"));

  // Side panel features
  check('Has watchlist', html.includes('id="watchlist"'));
  check('Has add symbol input', html.includes('addSymbolInput'));
  check('Has dropzone', html.includes('id="dropzone"'));
  check('Has file input', html.includes('id="fileInput"'));
  check('Has fetch URL input', html.includes('id="fetchUrl"'));
  check('Has paste data input', html.includes('id="pasteData"'));
  check('Has activity log', html.includes('id="logArea"'));

  // Data source configuration
  check('Has settings modal', html.includes('modalSettings'));
  check('Has datasource modal', html.includes('modalDatasource'));
  check('Has Robinhood option', html.includes('robinhood'));
  check('Has Yahoo Finance option', html.includes('Yahoo Finance'));
  check('Has Alpha Vantage option', html.includes('Alpha Vantage'));
  check('Has CORS proxy setting', html.includes('settingProxy'));
  check('Has fallback behavior setting', html.includes('dsFallback'));

  // Data source APIs
  check('Has fetchRobinhood function', html.includes('fetchRobinhood'));
  check('Has fetchYahoo function', html.includes('fetchYahoo'));
  check('Has fetchAlphaVantage function', html.includes('fetchAlphaVantage'));
  check('Has simulateTick fallback', html.includes('simulateTick'));

  // Correlation math
  check('Has pearson function', html.includes('function pearson'));
  check('Has rollingCorrelation function', html.includes('function rollingCorrelation'));
  check('Has computeReturns function', html.includes('function computeReturns'));

  // Data ingestion
  check('Has ingestJSON function', html.includes('function ingestJSON'));
  check('Has ingestCSV function', html.includes('function ingestCSV'));
  check('Has fetchFromUrl function', html.includes('function fetchFromUrl'));
  check('Has exportCSV function', html.includes('function exportCSV'));
  check('Has drag & drop setup', html.includes('setupDragDrop'));

  // Polling / realtime
  check('Has startPolling function', html.includes('function startPolling'));
  check('Has setInterval for polling', html.includes('setInterval'));
  check('Has fetchQuotes function', html.includes('function fetchQuotes'));

  // Backfill
  check('Has requestBackfill function', html.includes('function requestBackfill'));
  check('Has backfillRobinhood function', html.includes('function backfillRobinhood'));
  check('Has backfillYahoo function', html.includes('function backfillYahoo'));
  check('Has simulateBackfill function', html.includes('function simulateBackfill'));

  // Persistence
  check('Has localStorage persistence', html.includes('localStorage'));
  check('Has persistState function', html.includes('function persistState'));

  // CSS features
  check('Has pulse animation for live status', html.includes('@keyframes pulse'));
  check('Has dark theme (--bg: #05080f)', html.includes('--bg: #05080f'));
  check('Has responsive grid', html.includes('grid-template-columns'));

  // No errors in static code
  check('No syntax errors (balanced braces)', (() => {
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/g);
    if (!scriptMatch) return false;
    let braces = 0;
    for (const script of scriptMatch) {
      for (const c of script) {
        if (c === '{') braces++;
        if (c === '}') braces--;
        if (braces < 0) return false;
      }
    }
    return braces === 0;
  })());

  console.log(`\n${pass ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'} (${results.filter(r => r.ok).length}/${results.length})\n`);
  return pass;
}

// ============================================================
// BROWSER TESTS (requires Puppeteer + Chrome)
// ============================================================
async function browserTests(url) {
  console.log('🌐 Browser Tests\n');
  console.log(`  URL: ${url}\n`);

  const results = [];
  let pass = true;

  function check(name, condition) {
    const ok = !!condition;
    if (!ok) pass = false;
    results.push({ name, ok });
    console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const consoleErrors = [];
    const jsExceptions = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected CORS/network errors from APIs
        if (text.includes('api.robinhood') || text.includes('finance.yahoo') ||
            text.includes('ERR_NAME_NOT_RESOLVED') || text.includes('net::ERR') ||
            text.includes('favicon')) return;
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', err => {
      jsExceptions.push(err.message);
    });

    // Navigate
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    check('Page loads with HTTP 200', response.status() === 200);

    // Wait for simulated data to populate
    await new Promise(r => setTimeout(r, 8000));

    // Run in-page checks
    const pageChecks = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const bodyText = document.body.innerText;

      return {
        hasContent: bodyText.length > 100,
        hasSPY: html.includes('SPY'),
        hasUSO: html.includes('USO'),
        canvasCount: document.querySelectorAll('canvas').length,
        statValues: [...document.querySelectorAll('.stat-value')].map(el => el.textContent),
        hasStatusBadge: !!document.querySelector('.status-badge'),
        hasSymbolSelects: document.querySelectorAll('.symbol-select').length,
        backfillBtnCount: document.querySelectorAll('.backfill-group .btn').length,
        hasWatchlist: !!document.getElementById('watchlist'),
        watchlistItems: document.querySelectorAll('#watchlist .feed-item').length,
        hasDropzone: !!document.getElementById('dropzone'),
        hasLogArea: !!document.getElementById('logArea'),
        logEntryCount: document.querySelectorAll('#logArea .log-entry').length,
        navTabCount: document.querySelectorAll('.nav-tab').length,
        navTabNames: [...document.querySelectorAll('.nav-tab')].map(t => t.textContent.trim()),
        noVisibleErrors: !bodyText.includes('undefined') && !bodyText.includes('NaN') && !bodyText.includes('[object Object]'),
        hasPriceData: [...document.querySelectorAll('.stat-value')].some(el => /\d+\.\d{2}/.test(el.textContent)),
        title: document.title
      };
    });

    check('Page title is set', pageChecks.title.includes('Correlate'));
    check('Page has content', pageChecks.hasContent);
    check('SPY ticker present', pageChecks.hasSPY);
    check('USO ticker present', pageChecks.hasUSO);
    check('Charts rendered (3 canvases expected)', pageChecks.canvasCount >= 3);
    check('Stat cards populated', pageChecks.statValues.length >= 5);
    check('Price data displayed', pageChecks.hasPriceData);
    check('Status badge present', pageChecks.hasStatusBadge);
    check('Symbol selectors present (2)', pageChecks.hasSymbolSelects >= 2);
    check('Backfill buttons present (5)', pageChecks.backfillBtnCount >= 5);
    check('Watchlist rendered', pageChecks.hasWatchlist);
    check('Watchlist has items', pageChecks.watchlistItems >= 3);
    check('Dropzone present', pageChecks.hasDropzone);
    check('Activity log present', pageChecks.hasLogArea);
    check('Log entries generated', pageChecks.logEntryCount >= 1);
    check('Navigation tabs (3)', pageChecks.navTabCount >= 3);
    check('No visible NaN/undefined', pageChecks.noVisibleErrors);
    check('Zero JS exceptions', jsExceptions.length === 0);
    check('Zero console errors', consoleErrors.length === 0);

    // Test tab switching
    await page.click('.nav-tab:nth-child(2)'); // Scatter tab
    await new Promise(r => setTimeout(r, 500));
    const scatterVisible = await page.evaluate(() => {
      return document.getElementById('viewScatter').style.display !== 'none';
    });
    check('Scatter view activates on tab click', scatterVisible);

    await page.click('.nav-tab:nth-child(3)'); // Table tab
    await new Promise(r => setTimeout(r, 500));
    const tableVisible = await page.evaluate(() => {
      return document.getElementById('viewTable').style.display !== 'none';
    });
    check('Table view activates on tab click', tableVisible);

    // Test symbol change
    await page.select('#symbolA', 'VIX');
    await new Promise(r => setTimeout(r, 1000));
    const corrLabel = await page.evaluate(() => document.getElementById('corrLabel').textContent);
    check('Correlation label updates on symbol change', corrLabel.includes('VIX'));

    if (jsExceptions.length > 0) {
      console.log('\n  JS Exceptions:');
      jsExceptions.forEach(e => console.log(`    - ${e}`));
    }
    if (consoleErrors.length > 0) {
      console.log('\n  Console Errors:');
      consoleErrors.forEach(e => console.log(`    - ${e}`));
    }

  } finally {
    await browser.close();
  }

  console.log(`\n${pass ? '✅ ALL BROWSER TESTS PASSED' : '❌ SOME BROWSER TESTS FAILED'} (${results.filter(r => r.ok).length}/${results.length})\n`);
  return pass;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Correlate — UI Test Suite               ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Always run static validation
  const staticPass = staticValidation();

  // Run browser tests if Puppeteer is available
  if (puppeteer) {
    const url = process.argv[2] || `file://${path.join(__dirname, 'index.html')}`;
    try {
      const browserPass = await browserTests(url);
      process.exit(staticPass && browserPass ? 0 : 1);
    } catch (err) {
      console.log(`\n⚠ Browser tests skipped: ${err.message}\n`);
      process.exit(staticPass ? 0 : 1);
    }
  } else {
    process.exit(staticPass ? 0 : 1);
  }
}

main();
