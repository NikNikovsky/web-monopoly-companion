#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '../config');
const targetDir = path.join(__dirname, '../frontend/public/config');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function syncDirectory(source, target) {
  ensureDir(target);

  const items = fs.readdirSync(source, { withFileTypes: true });

  for (const item of items) {
    const sourcePath = path.join(source, item.name);
    const targetPath = path.join(target, item.name);

    if (item.isDirectory()) {
      syncDirectory(sourcePath, targetPath);
    } else if (item.name.endsWith('.json')) {
      const content = fs.readFileSync(sourcePath, 'utf8');
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`✓ Synced: ${path.relative(sourceDir, sourcePath)}`);
    }
  }
}

try {
  syncDirectory(sourceDir, targetDir);
  console.log('\n✅ Config synchronization complete!');
} catch (error) {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
}
