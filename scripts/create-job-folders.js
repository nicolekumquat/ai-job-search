const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURE: Where to create job folders
// By default, creates them in the repo root.
// Change OUTPUT_DIR to create them elsewhere (e.g., '_Potential/')
// ============================================================
const INPUT_FILE = 'linkedin-jd-results.json';
const OUTPUT_DIR = path.join(__dirname, '..');

if (!fs.existsSync(INPUT_FILE)) {
  console.log(`${INPUT_FILE} not found. Run linkedin-scrape-jds.js first.`);
  process.exit(1);
}

const jds = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').substring(0, 30);
}

for (const job of jds) {
  const num = String(job.num).padStart(2, '0');
  const folderName = `J-${num}-${sanitize(job.company)}`;
  const folderPath = path.join(OUTPUT_DIR, folderName);

  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  let md = `# ${job.title}\n\n`;
  md += `**Company:** ${job.company}\n`;
  md += `**Source:** [LinkedIn](${job.url})\n`;
  if (job.location) md += `**Location/Info:** ${job.location}\n`;
  md += `**Scraped:** ${new Date().toISOString().split('T')[0]}\n`;
  md += `\n---\n\n`;
  md += job.description || '*(No description scraped)*';
  md += '\n';

  fs.writeFileSync(path.join(folderPath, 'Job-Description.md'), md);
  console.log(`Created: ${folderName}/Job-Description.md`);
}

console.log(`\nDone! Created ${jds.length} folders.`);
console.log('Next: triage folders into _Active/, _Potential/, or _Archive/');
