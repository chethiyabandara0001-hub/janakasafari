import fs from 'fs';
import path from 'path';

function replaceInFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace Logo image URLs with the new Nisha Safari SVG logo
  content = content.replace(
    /https:\/\/www\.srilankayalasafaris\.com\/uploads\/7\/2\/3\/0\/7230455\/janaka-safari-logo-web(?:_orig)?\.png/g,
    '/assets/media/nisha-safari-logo.svg'
  );
  content = content.replace(
    /assets\/media\/janaka-safari-logo-web(?:_orig)?\.png/g,
    '/assets/media/nisha-safari-logo.svg'
  );

  // 2. Replace email address
  content = content.replace(/safarijanaka@gmail\.com/gi, 'safarinisha@gmail.com');

  // 3. Replace uppercase and Title Case Janaka -> Nisha everywhere
  content = content.replace(/JANAKA/g, 'NISHA');
  content = content.replace(/Janaka/g, 'Nisha');

  // 4. Also fix hero minHeight in site.js if present
  if (filePath.endsWith('site.js')) {
    content = content.replace(/minHeight = "112vh"/g, 'minHeight = "135vh"');
    content = content.replace(/height = "112vh"/g, 'height = "135vh"');
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

const htmlPages = [
  'index.html',
  'about.html',
  'contact.html',
  'gallery.html',
  'reviews.html',
  'safari-parks.html',
  'yala-safari.html',
  'bundala-birding-safari.html',
  'udawalawe-safari.html',
  'wilpattu-safari.html',
  'minneriya-safari.html',
  'kumana-birding-safari.html',
];

const targetFiles = [
  ...htmlPages.map((f) => `public/${f}`),
  ...htmlPages.map((f) => `public/assets/html-defaults/${f}`),
  ...htmlPages,
  'public/assets/firebase-cms-state.json',
  'lib/section-seed-data.ts',
  'app/layout.tsx',
  'app/admin/page.tsx',
  'public/assets/js/site.js',
  'assets/js/site.js',
];

targetFiles.forEach((file) => {
  const p = path.resolve(process.cwd(), file);
  replaceInFile(p);
});

console.log('Successfully updated all Janaka names and logos to Nisha across all files.');
