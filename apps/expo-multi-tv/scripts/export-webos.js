#!/usr/bin/env node

/**
 * Export Web Distribution to LG webOS Package
 *
 * This script prepares the Expo web build for LG webOS TV by:
 * 1. Creating the required appinfo.json file
 * 2. Adding necessary icons
 * 3. Structuring files for webOS packaging
 * 4. Optionally creating an IPK package using ares-package
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DIST_DIR = path.join(__dirname, '../dist');
const WEBOS_DIR = path.join(__dirname, '../webos-build');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');

// Read package.json for app metadata
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// webOS app configuration
const WEBOS_CONFIG = {
  id: 'com.multitv.expoapp',
  version: packageJson.version || '1.0.0',
  vendor: 'Multi-TV',
  type: 'web',
  main: 'index.html',
  title: 'Multi-TV App',
  icon: 'icon-80.png',
  largeIcon: 'icon-130.png',
  bgImage: 'splash.png',
  appDescription: 'Multi-platform TV application built with React Native',
  resolution: '1920x1080',
  disableBackHistoryAPI: true,
  handlesRelaunch: true,
};

/**
 * Create appinfo.json file
 */
function createAppInfo() {
  const appInfo = {
    id: WEBOS_CONFIG.id,
    version: WEBOS_CONFIG.version,
    vendor: WEBOS_CONFIG.vendor,
    type: WEBOS_CONFIG.type,
    main: WEBOS_CONFIG.main,
    title: WEBOS_CONFIG.title,
    icon: WEBOS_CONFIG.icon,
    largeIcon: WEBOS_CONFIG.largeIcon,
    bgImage: WEBOS_CONFIG.bgImage,
    appDescription: WEBOS_CONFIG.appDescription,
    resolution: WEBOS_CONFIG.resolution,
    disableBackHistoryAPI: WEBOS_CONFIG.disableBackHistoryAPI,
    handlesRelaunch: WEBOS_CONFIG.handlesRelaunch,
  };

  const appInfoPath = path.join(WEBOS_DIR, 'appinfo.json');
  fs.writeFileSync(appInfoPath, JSON.stringify(appInfo, null, 2));
  console.log('✓ Created appinfo.json');
}

/**
 * Copy dist files to webOS build directory
 */
function copyDistFiles() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist directory not found. Please run "npx expo export --platform web" first.');
    process.exit(1);
  }

  // Create webOS build directory
  if (fs.existsSync(WEBOS_DIR)) {
    fs.rmSync(WEBOS_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(WEBOS_DIR, { recursive: true });

  // Copy all dist files
  copyDirectory(DIST_DIR, WEBOS_DIR);
  console.log('✓ Copied dist files to webOS build directory');
}

/**
 * Fix paths in index.html to use relative paths
 */
function fixIndexHtmlPaths() {
  const indexPath = path.join(WEBOS_DIR, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.warn('⚠ index.html not found, skipping path fixes');
    return;
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');

  // Replace absolute paths with relative paths (no leading dot or slash)
  // Match patterns like src="/_expo/ or href="/_expo/ and remove the leading slash
  indexContent = indexContent.replace(/src="\/_expo\//g, 'src="_expo/');
  indexContent = indexContent.replace(/href="\/_expo\//g, 'href="_expo/');

  // Handle other patterns that might have leading slashes
  indexContent = indexContent.replace(/src="\/([^"]+)"/g, 'src="$1"');
  indexContent = indexContent.replace(/href="\/([^"]+)"/g, 'href="$1"');

  fs.writeFileSync(indexPath, indexContent);
  console.log('✓ Fixed paths in index.html to use relative URLs (no leading slash)');
}

/**
 * Recursively copy directory
 */
function copyDirectory(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Create or copy icons
 */
function handleIcons() {
  const iconsDir = path.join(__dirname, '../assets/images');
  const icon80Path = path.join(WEBOS_DIR, WEBOS_CONFIG.icon);
  const icon130Path = path.join(WEBOS_DIR, WEBOS_CONFIG.largeIcon);
  const splashPath = path.join(WEBOS_DIR, WEBOS_CONFIG.bgImage);

  // Check for existing icons in assets
  const placeholderIcon80 = path.join(iconsDir, 'icon-80.png');
  const placeholderIcon130 = path.join(iconsDir, 'icon-130.png');
  const placeholderSplash = path.join(iconsDir, 'splash-1920x1080.png');

  // Copy 80x80 icon
  if (fs.existsSync(placeholderIcon80)) {
    fs.copyFileSync(placeholderIcon80, icon80Path);
    console.log('✓ Copied 80x80 icon');
  } else {
    console.warn('⚠ No 80x80 icon found. You need to add:');
    console.warn(`  - assets/images/icon-80.png (80x80 PNG)`);
  }

  // Copy 130x130 icon
  if (fs.existsSync(placeholderIcon130)) {
    fs.copyFileSync(placeholderIcon130, icon130Path);
    console.log('✓ Copied 130x130 icon');
  } else {
    console.warn('⚠ No 130x130 icon found. You need to add:');
    console.warn(`  - assets/images/icon-130.png (130x130 PNG)`);
  }

  // Copy splash image
  if (fs.existsSync(placeholderSplash)) {
    fs.copyFileSync(placeholderSplash, splashPath);
    console.log('✓ Copied splash image');
  } else {
    console.warn('⚠ No splash image found. You may want to add:');
    console.warn(`  - assets/images/splash-1920x1080.png (1920x1080 PNG)`);
  }
}

/**
 * Create IPK package using ares-package
 */
function createIPK() {
  const { execSync } = require('child_process');

  try {
    // Check if ares-package is installed
    execSync('which ares-package', { stdio: 'ignore' });

    console.log('\n📦 Creating IPK package...');
    const ipkOutputDir = path.join(__dirname, '../');
    // Use --no-minify flag to skip minification since Expo already minifies
    execSync(`ares-package "${WEBOS_DIR}" -o "${ipkOutputDir}" --no-minify`, { stdio: 'inherit' });
    console.log('✓ IPK package created successfully');
  } catch (error) {
    console.warn('\n⚠ ares-package not found. To create an IPK package:');
    console.warn('  1. Install webOS CLI: npm install -g @webos-tools/cli');
    console.warn('  2. Run: ares-package webos-build --no-minify');
  }
}

/**
 * Display instructions
 */
function displayInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('webOS Build Complete!');
  console.log('='.repeat(60));
  console.log(`\nBuild directory: ${WEBOS_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Review and customize appinfo.json if needed');
  console.log('  2. Add proper icons (80x80 and 130x130 PNG)');
  console.log('  3. Add splash image (1920x1080 PNG) if desired');
  console.log('\nTo create an IPK package:');
  console.log('  npm install -g @webos-tools/cli');
  console.log(`  ares-package ${path.relative(process.cwd(), WEBOS_DIR)}`);
  console.log('\nTo install on your LG TV:');
  console.log('  ares-setup-device --add <device-name> <ip-address>');
  console.log('  ares-install --device <device-name> com.multitv.expoapp_*.ipk');
  console.log('  ares-launch --device <device-name> com.multitv.expoapp');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
function main() {
  console.log('Starting webOS export process...\n');

  try {
    copyDistFiles();
    fixIndexHtmlPaths();
    createAppInfo();
    handleIcons();
    createIPK();
    displayInstructions();
  } catch (error) {
    console.error('Error during webOS export:', error.message);
    process.exit(1);
  }
}

main();
