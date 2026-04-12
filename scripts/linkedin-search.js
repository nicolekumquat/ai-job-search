const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURE YOUR SEARCHES HERE
// Each search has a label (for your reference) and a LinkedIn Jobs URL.
// To build a URL: go to LinkedIn Jobs, set your filters, copy the URL.
// ============================================================
const searches = [
  {
    label: 'Example: Director product management AI (Remote, 30d)',
    url: 'https://www.linkedin.com/jobs/search/?keywords=director+%22product+management%22+AI&location=United+States&f_WT=2&f_TPR=r2592000&sortBy=DD&f_E=6'
  },
  // Add more searches here. Tips for building URLs:
  // f_WT=2 = Remote, f_WT=3 = Hybrid, f_WT=1 = On-site
  // f_TPR=r2592000 = Last 30 days, r604800 = Last week
  // f_E=6 = Executive level, f_E=5 = Director level
  // sortBy=DD = Most recent first
];

const OUTPUT_FILE = 'linkedin-search-results.json';
const MAX_RESULTS_PER_SEARCH = 15;

(async () => {
  const tempDir = path.join(process.env.TEMP || '/tmp', 'playwright-edge-linkedin');

  const context = await chromium.launchPersistentContext(tempDir, {
    headless: false,
    channel: 'msedge',
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  // Navigate to LinkedIn and wait for manual login
  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('=== WAITING FOR LOGIN ===');
  console.log('Please log in to LinkedIn in the browser window.');
  console.log('Once logged in, the script will automatically continue...');

  try {
    await page.waitForURL(/linkedin\.com\/(feed|jobs|in\/)/, { timeout: 120000 });
    console.log('Login detected! Starting searches...');
  } catch (e) {
    console.log('Login timeout - checking current page...');
  }

  await page.waitForTimeout(3000);

  let allResults = [];

  for (let i = 0; i < searches.length; i++) {
    console.log(`\n--- Search ${i + 1}: ${searches[i].label} ---`);
    await page.goto(searches[i].url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(6000);

    // Scroll to load more results
    for (let s = 0; s < 3; s++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(2000);

    const jobs = await page.evaluate((maxResults) => {
      const selectors = [
        '.jobs-search-results__list-item',
        '.job-card-container',
        '[data-job-id]',
        '.scaffold-layout__list-item',
        'li.ember-view.occludable-update'
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = document.querySelectorAll(sel);
        if (cards.length > 0) break;
      }

      const results = [];
      cards.forEach((card, idx) => {
        if (idx >= maxResults) return;

        const allLinks = card.querySelectorAll('a');
        const allText = card.textContent.replace(/\s+/g, ' ').trim();

        let title = 'N/A', company = 'N/A', location = 'N/A', href = 'N/A';

        for (const link of allLinks) {
          if (link.href && link.href.includes('/jobs/view')) {
            title = link.textContent.trim().split('\n')[0].trim();
            href = link.href;
            break;
          }
        }

        if (title === 'N/A' && allLinks.length > 0) {
          title = allLinks[0].textContent.trim().split('\n')[0].trim();
          href = allLinks[0].href || 'N/A';
        }

        const companyEl = card.querySelector('[class*="company"], [class*="subtitle"], [data-test-app-aware-link]');
        if (companyEl) company = companyEl.textContent.trim().split('\n')[0].trim();

        const locEl = card.querySelector('[class*="location"], [class*="metadata-item"], [class*="caption"]');
        if (locEl) location = locEl.textContent.trim().split('\n')[0].trim();

        if (title !== 'N/A' && title.length > 3) {
          results.push({ title, company, location, url: href, rawText: allText.substring(0, 300) });
        }
      });
      return results;
    }, MAX_RESULTS_PER_SEARCH);

    console.log(`Found ${jobs.length} jobs`);
    jobs.forEach(j => {
      console.log(`  ${j.title} | ${j.company} | ${j.location}`);
    });
    allResults.push(...jobs.map(j => ({ ...j, search: searches[i].label })));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2));
  console.log(`\n=== DONE === Total: ${allResults.length} jobs saved to ${OUTPUT_FILE}`);

  await context.close();
})().catch(e => console.error('ERROR:', e.message));
