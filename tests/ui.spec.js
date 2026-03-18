/**
 * Puppeteer UI tests for the correlate realtime dashboard.
 * Run: node tests/ui.spec.js
 * Tests the live GitHub Pages URL, falling back to a local file:// path.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PAGE_URL = process.env.TEST_URL ||
  'https://tandylew.github.io/correlate/';
const LOCAL_URL = `file://${path.resolve(__dirname, '..', 'index.html')}`;

async function runTests(url) {
  const results = {
    url,
    timestamp: new Date().toISOString(),
    console_errors: [],
    js_exceptions: [],
    checks: {},
    pass: true
  };

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        const loc = msg.location();
        const isFavicon = (loc?.url || '').includes('favicon');
        const isResource = text.includes('Failed to load resource');
        if (isFavicon || (isResource && !(loc?.url || '').includes('index'))) return;
        results.console_errors.push({ text, location: loc });
      }
    });

    page.on('pageerror', err => {
      results.js_exceptions.push({ message: err.message, stack: err.stack });
      results.pass = false;
    });

    const response = await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    results.http_status = response ? response.status() : 'file';
    results.page_title = await page.title();

    // Wait for Chart.js and demo tick to initialize
    await new Promise(r => setTimeout(r, 3000));

    results.checks = await page.evaluate(() => {
      const html = document.documentElement.innerHTML;
      const checks = {};

      // Basic content
      checks.has_content = document.body.innerText.length > 100;
      checks.page_title_correct = document.title.includes('correlate');

      // Symbols present
      checks.has_spy = html.includes('SPY');
      checks.has_uso = html.includes('USO');
      checks.has_vix = html.includes('VIX');

      // Status dot (DEMO / LIVE indicator)
      const dot = document.querySelector('.status-dot');
      checks.has_status_dot = !!dot;
      checks.status_is_demo = dot ? dot.classList.contains('dot-demo') : false;

      // Ticker strip
      const tickers = document.querySelectorAll('.tick-item');
      checks.ticker_count = tickers.length;
      checks.has_ticker_strip = tickers.length >= 3;

      // Navigation tabs
      const navBtns = document.querySelectorAll('.nav-btn');
      checks.tab_count = navBtns.length;
      checks.tab_names = [...navBtns].map(t => t.textContent.trim());
      checks.has_nav_tabs = navBtns.length >= 3;

      // Price cards (Market tab, active by default)
      const priceCards = document.querySelectorAll('.price-card');
      checks.price_card_count = priceCards.length;
      checks.has_price_cards = priceCards.length >= 3;

      // Chart canvases
      const canvases = document.querySelectorAll('canvas');
      checks.canvas_count = canvases.length;
      checks.has_charts = canvases.length > 0;

      // Backfill footer
      checks.has_backfill_bar = !!document.querySelector('#backfill-bar');
      const backfillBtns = document.querySelectorAll('#backfill-btns button');
      checks.backfill_btn_count = backfillBtns.length;
      checks.has_backfill_buttons = backfillBtns.length >= 4;

      // Settings button
      checks.has_settings_btn = !!document.querySelector('#settings-btn');

      // Correlation display (on Correlate tab)
      checks.has_corr_display = !!document.querySelector('#corr-r-display');

      // Prices have loaded (not all dashes)
      const prices = [...document.querySelectorAll('.pc-price')].map(e => e.textContent.trim());
      checks.prices = prices;
      checks.prices_loaded = prices.some(p => p !== '—' && p !== '$—');

      // No broken display values
      const bodyText = document.body.innerText;
      checks.no_object_display = !bodyText.includes('[object Object]');
      // NaN is acceptable in chart tooltips but not in price display
      const priceText = [...document.querySelectorAll('.pc-price, .tick-price')].map(e => e.textContent).join(' ');
      checks.no_nan_prices = !priceText.includes('NaN');

      return checks;
    });

    // Click Correlate tab and verify it shows correlation stats
    await page.click('[data-tab="correlate"]');
    await new Promise(r => setTimeout(r, 1000));

    const corrCheck = await page.evaluate(() => {
      const corrDisplay = document.querySelector('#corr-r-display');
      const corrTab = document.querySelector('#tab-correlate');
      return {
        corr_tab_visible: corrTab ? corrTab.classList.contains('active') : false,
        corr_value: corrDisplay ? corrDisplay.textContent.trim() : null,
        corr_not_empty: corrDisplay ? corrDisplay.textContent.trim() !== '' : false,
      };
    });

    Object.assign(results.checks, corrCheck);

    // Click Ingest tab
    await page.click('[data-tab="ingest"]');
    await new Promise(r => setTimeout(r, 500));

    const ingestCheck = await page.evaluate(() => {
      const ingestTab = document.querySelector('#tab-ingest');
      return {
        ingest_tab_visible: ingestTab ? ingestTab.classList.contains('active') : false,
        has_file_upload: !!document.querySelector('#ingest-file'),
        has_paste_area: !!document.querySelector('#ingest-paste-text'),
        has_fetch_input: !!document.querySelector('#ingest-url'),
      };
    });

    Object.assign(results.checks, ingestCheck);

    // Determine pass/fail
    const required = [
      'has_content', 'has_spy', 'has_uso', 'has_vix',
      'has_status_dot', 'has_ticker_strip', 'has_nav_tabs',
      'has_price_cards', 'has_charts', 'has_backfill_bar',
      'has_backfill_buttons', 'has_settings_btn',
      'prices_loaded', 'no_object_display', 'no_nan_prices',
      'corr_tab_visible', 'ingest_tab_visible',
    ];

    for (const key of required) {
      if (!results.checks[key]) {
        results.pass = false;
        results.checks[`FAIL_${key}`] = true;
      }
    }

    if (results.console_errors.length > 0) results.pass = false;

  } finally {
    await browser.close();
  }

  return results;
}

(async () => {
  // Try live URL first, fall back to local
  let url = PAGE_URL;
  let results;

  console.log(`\nRunning UI tests against: ${url}\n`);

  try {
    results = await runTests(url);
  } catch (err) {
    console.warn(`Live URL failed (${err.message}), falling back to local file`);
    url = LOCAL_URL;
    console.log(`Retrying with: ${url}\n`);
    results = await runTests(url);
  }

  // Print results
  console.log('\n=== Test Results ===');
  console.log(`URL: ${results.url}`);
  console.log(`Page title: ${results.page_title}`);
  console.log(`HTTP status: ${results.http_status}`);
  console.log(`\nChecks:`);

  for (const [k, v] of Object.entries(results.checks)) {
    if (k.startsWith('FAIL_')) continue;
    const failed = results.checks[`FAIL_${k}`];
    const icon = failed ? '✗' : (typeof v === 'boolean' ? (v ? '✓' : '·') : ' ');
    console.log(`  ${icon} ${k}: ${JSON.stringify(v)}`);
  }

  if (results.console_errors.length) {
    console.log('\nConsole errors:');
    results.console_errors.forEach(e => console.log(`  - ${e.text}`));
  }

  if (results.js_exceptions.length) {
    console.log('\nJS exceptions:');
    results.js_exceptions.forEach(e => console.log(`  - ${e.message}`));
  }

  console.log(`\n${results.pass ? '✓ ALL TESTS PASSED' : '✗ TESTS FAILED'}\n`);

  const outPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Results saved to ${outPath}`);

  process.exit(results.pass ? 0 : 1);
})();
