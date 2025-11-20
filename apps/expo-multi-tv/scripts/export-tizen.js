#!/usr/bin/env node

/**
 * Export Web Distribution to Samsung Tizen Package
 *
 * This script prepares the Expo web build for Samsung Tizen TV by:
 * 1. Creating the required config.xml file
 * 2. Adding necessary icons
 * 3. Structuring files for Tizen packaging
 * 4. Optionally creating a WGT package using tizen CLI
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DIST_DIR = path.join(__dirname, '../dist');
const TIZEN_DIR = path.join(__dirname, '../tizen-build');
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');

// Read package.json for app metadata
let packageJson;
try {
  packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
} catch (error) {
  console.error('Error reading package.json:', error.message);
  process.exit(1);
}

// Tizen app configuration
const TIZEN_CONFIG = {
  packageId: 'MultiTVExpoApp',
  appId: 'multitv.expoapp',
  version: packageJson.version || '1.0.0',
  name: 'Multi-TV App',
  author: {
    name: 'Multi-TV',
    email: 'developer@multitv.com',
    href: 'https://multitv.com',
  },
  description: 'Multi-platform TV application built with React Native',
  icon: 'icon.png',
  content: 'index.html',
  privileges: [
    'http://tizen.org/privilege/internet',
    'http://tizen.org/privilege/application.launch',
  ],
  features: [
    'http://tizen.org/feature/screen.size.normal.1080.1920',
  ],
};

/**
 * Create config.xml file for Tizen
 */
function createConfigXml() {
  const configXml = `<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets"
        xmlns:tizen="http://tizen.org/ns/widgets"
        id="${TIZEN_CONFIG.packageId}"
        version="${TIZEN_CONFIG.version}"
        viewmodes="maximized">
    <tizen:application id="${TIZEN_CONFIG.appId}" package="${TIZEN_CONFIG.packageId}" required_version="6.0"/>
    <content src="${TIZEN_CONFIG.content}"/>
    <feature name="http://tizen.org/feature/screen.size.normal.1080.1920"/>
    <icon src="${TIZEN_CONFIG.icon}"/>
    <name>${TIZEN_CONFIG.name}</name>
    <tizen:profile name="tv-samsung"/>
    <tizen:privilege name="http://tizen.org/privilege/internet"/>
    <tizen:privilege name="http://tizen.org/privilege/application.launch"/>
    <tizen:setting screen-orientation="landscape"
                   context-menu="enable"
                   background-support="disable"
                   encryption="disable"
                   install-location="auto"
                   hwkey-event="enable"/>
    <description>${TIZEN_CONFIG.description}</description>
    <author email="${TIZEN_CONFIG.author.email}"
            href="${TIZEN_CONFIG.author.href}">
        ${TIZEN_CONFIG.author.name}
    </author>
</widget>`;

  const configPath = path.join(TIZEN_DIR, 'config.xml');
  fs.writeFileSync(configPath, configXml);
  console.log('✓ Created config.xml');
}

/**
 * Copy dist files to Tizen build directory
 */
function copyDistFiles() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist directory not found. Please run "npx expo export --platform web" first.');
    process.exit(1);
  }

  // Create Tizen build directory
  if (fs.existsSync(TIZEN_DIR)) {
    fs.rmSync(TIZEN_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TIZEN_DIR, { recursive: true });

  // Copy all dist files
  copyDirectory(DIST_DIR, TIZEN_DIR);
  console.log('✓ Copied dist files to Tizen build directory');
}

/**
 * Fix paths in index.html to use relative paths
 */
function fixIndexHtmlPaths() {
  const indexPath = path.join(TIZEN_DIR, 'index.html');

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
  const iconPath = path.join(TIZEN_DIR, TIZEN_CONFIG.icon);

  // Check for existing icon in assets
  const placeholderIcon = path.join(iconsDir, 'icon-512.png');

  // Copy icon (Tizen typically uses 512x512)
  if (fs.existsSync(placeholderIcon)) {
    fs.copyFileSync(placeholderIcon, iconPath);
    console.log('✓ Copied 512x512 icon');
  } else {
    console.warn('⚠ No 512x512 icon found. You need to add:');
    console.warn(`  - assets/images/icon-512.png (512x512 PNG)`);
  }
}

/**
 * Create WGT package using tizen CLI
 */
function createWGT() {
  const { execSync } = require('child_process');

  try {
    // Check if tizen CLI is installed
    execSync('which tizen', { stdio: 'ignore' });

    console.log('\n📦 Creating WGT package...');
    const wgtOutputDir = path.join(__dirname, '../');

    // Use tizen package command
    execSync(`tizen package -t wgt -s ${TIZEN_CONFIG.packageId} -o "${wgtOutputDir}" -- "${TIZEN_DIR}"`, { stdio: 'inherit' });
    console.log('✓ WGT package created successfully');
  } catch (error) {
    console.warn('\n⚠ tizen CLI not found. To create a WGT package:');
    console.warn('  1. Install Tizen Studio: https://developer.tizen.org/development/tizen-studio/download');
    console.warn('  2. Add tizen CLI to your PATH');
    console.warn('  3. Create certificate: tizen certificate -a MyProfile -p <password>');
    console.warn('  4. Run: tizen package -t wgt -s ' + TIZEN_CONFIG.packageId + ' -- tizen-build');
  }
}

/**
 * Display instructions
 */
function displayInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('Tizen Build Complete!');
  console.log('='.repeat(60));
  console.log(`\nBuild directory: ${TIZEN_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Review and customize config.xml if needed');
  console.log('  2. Add proper icon (512x512 PNG)');
  console.log('\nTo create a WGT package:');
  console.log('  1. Install Tizen Studio');
  console.log('  2. Create a certificate:');
  console.log('     tizen certificate -a MyProfile -p <password>');
  console.log('  3. Create security profile:');
  console.log('     tizen security-profiles add -n MyProfile -a /path/to/author.p12 -p <password>');
  console.log('  4. Package the app:');
  console.log(`     tizen package -t wgt -s ${TIZEN_CONFIG.packageId} -- ${path.relative(process.cwd(), TIZEN_DIR)}`);
  console.log('\nTo install on your Samsung TV:');
  console.log('  1. Enable developer mode on TV');
  console.log('  2. Connect to TV:');
  console.log('     tizen connect <tv-ip-address>');
  console.log('  3. Install the app:');
  console.log('     tizen install -n ' + TIZEN_CONFIG.packageId + '.wgt -t <tv-name>');
  console.log('  4. Run the app:');
  console.log('     tizen run -p ' + TIZEN_CONFIG.packageId + ' -t <tv-name>');
  console.log('='.repeat(60) + '\n');
}

/**
 * Main execution
 */
function main() {
  console.log('Starting Tizen export process...\n');

  try {
    copyDistFiles();
    fixIndexHtmlPaths();
    createConfigXml();
    handleIcons();
    createWGT();
    displayInstructions();
  } catch (error) {
    console.error('Error during Tizen export:', error.message);
    process.exit(1);
  }
}

main();
