const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURE: Add jobs to scrape here after reviewing search results.
// Each entry needs a number, title, company, and LinkedIn job URL.
// ============================================================
const jobs = [
  // { num: 1, title: 'Director of Product', company: 'Acme Corp', url: 'https://www.linkedin.com/jobs/view/12345/' },
  // { num: 2, title: 'VP Engineering', company: 'TechCo', url: 'https://www.linkedin.com/jobs/view/67890/' },
];

const OUTPUT_FILE = 'linkedin-jd-results.json';

function parseJD(bodyText) {
  let description = '';
  const aboutIdx = bodyText.indexOf('About the job');
  if (aboutIdx !== -1) {
    const afterAbout = bodyText.substring(aboutIdx + 'About the job'.length);
    const endMarkers = ['Set alert for similar jobs', 'About the company', 'More jobs', 'People also viewed', 'Similar jobs'];
    let endIdx = afterAbout.length;
    for (const marker of endMarkers) {
      const idx = afterAbout.indexOf(marker);
      if (idx !== -1 && idx < endIdx) endIdx = idx;
    }
    description = afterAbout.substring(0, endIdx).trim();
  }

  const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
  let location = '';
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    if (lines[i].match(/(United States|Remote|Hybrid|On-site|WA|CA|TX|NY)/i) && lines[i].includes('·')) {
      location = lines[i];
      break;
    }
  }

  return { description, location };
}

(async () => {
  if (jobs.length === 0) {
    console.log('No jobs configured. Edit the jobs array in this file first.');
    console.log('Tip: review linkedin-search-results.json and pick the interesting ones.');
    process.exit(0);
  }

  const tempDir = path.join(process.env.TEMP || '/tmp', 'playwright-edge-linkedin');
  const context = await chromium.launchPersistentContext(tempDir, {
    headless: false,
    channel: 'msedge',
    viewport: { width: 1400, height: 900 }
  });
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('=== WAITING FOR LOGIN ===');
  console.log('Please log in to LinkedIn if needed...');

  try {
    await page.waitForURL(/linkedin\.com\/(feed|jobs|in\/)/, { timeout: 120000 });
    console.log('Login detected!');
  } catch (e) {
    console.log('Login timeout - continuing...');
  }
  await page.waitForTimeout(3000);

  // Load existing results to append to
  let results = [];
  try { results = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8')); } catch(e) {}

  for (const job of jobs) {
    console.log(`\n--- ${job.num}. ${job.title} (${job.company}) ---`);
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(6000);

      // Scroll to load lazy content
      for (let s = 0; s < 3; s++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(800);
      }

      // Click "Show more" buttons to expand truncated descriptions
      try {
        const btns = await page.$$('button');
        for (const btn of btns) {
          try {
            const txt = await btn.textContent();
            if (txt && (txt.includes('\u2026\u00a0more') || txt.includes('\u2026 more') || txt.includes('Show more') || txt.includes('See more'))) {
              await btn.click();
              await page.waitForTimeout(600);
            }
          } catch(e) {}
        }
      } catch(e) {}

      const bodyText = await page.evaluate(() => document.body.innerText);
      const parsed = parseJD(bodyText);

      console.log(`  Location: ${parsed.location || 'not parsed'}`);
      console.log(`  Description: ${parsed.description.length} chars`);

      results.push({
        ...job,
        location: parsed.location,
        description: parsed.description,
      });

      // Save after each job to avoid losing progress
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));

    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      results.push({ ...job, description: '', error: e.message });
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
    }
  }

  const successCount = results.filter(r => r.description && r.description.length > 100).length;
  console.log(`\n=== DONE === ${successCount}/${jobs.length} JDs scraped successfully`);

  await context.close();
})().catch(e => console.error('ERROR:', e.message));
