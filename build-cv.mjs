#!/usr/bin/env node

import { readFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import yaml from 'js-yaml';

// Load profile.yml to get the candidate's name
let fullName = 'Candidate';
const profilePath = join('config', 'profile.yml');
const examplePath = join('config', 'profile.example.yml');

if (existsSync(profilePath)) {
  try {
    const doc = yaml.load(readFileSync(profilePath, 'utf-8'));
    if (doc?.candidate?.full_name) {
      fullName = doc.candidate.full_name;
    }
  } catch (err) {
    console.error(`⚠️ Error parsing ${profilePath}:`, err.message);
  }
} else if (existsSync(examplePath)) {
  try {
    const doc = yaml.load(readFileSync(examplePath, 'utf-8'));
    if (doc?.candidate?.full_name) {
      fullName = doc.candidate.full_name;
    }
  } catch (err) {
    // Ignore example parse errors
  }
}

// Normalize name: "Jane Smith" -> "jane-smith", "JaneSmith"
const slugName = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const camelName = fullName.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('').replace(/[^A-Za-z0-9]+/g, '');

const htmlFile = `output/cv-${slugName}.html`;
const pdfFile = `output/${camelName}_Resume.pdf`;
const copyFile = `${camelName}_Resume (1).pdf`;

console.log(`👤 Candidate: ${fullName}`);
console.log(`📄 HTML Path:  ${htmlFile}`);
console.log(`📁 PDF Path:   ${pdfFile}`);
console.log(`💾 Copy Path:  ${copyFile}`);

// Step 1: Run generate-cv-html.mjs if it exists
if (existsSync('generate-cv-html.mjs')) {
  console.log('Generating HTML CV...');
  execSync('node generate-cv-html.mjs', { stdio: 'inherit' });
} else {
  console.log('ℹ️ generate-cv-html.mjs not found. Skipping HTML generation.');
}

// Step 2: Run generate-pdf.mjs
if (existsSync(htmlFile)) {
  console.log('Generating PDF...');
  execSync(`node generate-pdf.mjs ${htmlFile} ${pdfFile}`, { stdio: 'inherit' });

  // Step 3: Copy PDF
  if (existsSync(pdfFile)) {
    console.log(`Copying PDF to ${copyFile}...`);
    copyFileSync(pdfFile, copyFile);
    console.log('✅ Build complete.');
  } else {
    console.error(`❌ PDF file was not generated: ${pdfFile}`);
    process.exit(1);
  }
} else {
  console.error(`❌ HTML source file not found: ${htmlFile}`);
  process.exit(1);
}
