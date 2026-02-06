#!/usr/bin/env node

/**
 * HTTPS Security Headers Test Script
 * Tests that all required security headers are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔒 OpsTower HTTPS/SSL Configuration Test\n');
console.log('=' .repeat(60));

// Test 1: Verify middleware configuration
console.log('\n📋 Test 1: Middleware Configuration');
console.log('-'.repeat(60));

const middlewarePath = path.join(__dirname, '..', 'src', 'middleware', 'security.ts');
const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');

const checks = [
  {
    name: 'HTTPS Redirect Enabled',
    test: middlewareContent.includes("request.headers.get('x-forwarded-proto') === 'http'") &&
          middlewareContent.includes('NextResponse.redirect(httpsUrl, 301)'),
    required: true
  },
  {
    name: 'HSTS Header (max-age=31536000)',
    test: middlewareContent.includes('Strict-Transport-Security') &&
          middlewareContent.includes('max-age=31536000'),
    required: true
  },
  {
    name: 'HSTS includeSubDomains',
    test: middlewareContent.includes('includeSubDomains'),
    required: true
  },
  {
    name: 'HSTS preload',
    test: middlewareContent.includes('preload'),
    required: true
  },
  {
    name: 'Content-Security-Policy',
    test: middlewareContent.includes('Content-Security-Policy'),
    required: true
  },
  {
    name: 'X-Frame-Options: DENY',
    test: middlewareContent.includes('X-Frame-Options') &&
          middlewareContent.includes('DENY'),
    required: true
  },
  {
    name: 'X-Content-Type-Options: nosniff',
    test: middlewareContent.includes('X-Content-Type-Options') &&
          middlewareContent.includes('nosniff'),
    required: true
  },
  {
    name: 'Referrer-Policy',
    test: middlewareContent.includes('Referrer-Policy'),
    required: true
  },
  {
    name: 'Permissions-Policy',
    test: middlewareContent.includes('Permissions-Policy'),
    required: true
  }
];

let passed = 0;
let failed = 0;

checks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} ${check.required ? '(REQUIRED)' : ''}`);
    failed++;
  }
});

// Test 2: Verify next.config.js security headers
console.log('\n📋 Test 2: Next.js Configuration');
console.log('-'.repeat(60));

const nextConfigPath = path.join(__dirname, '..', 'next.config.js');
const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');

const nextChecks = [
  {
    name: 'Security headers function defined',
    test: nextConfigContent.includes('async headers()'),
    required: true
  },
  {
    name: 'HSTS in Next.js headers',
    test: nextConfigContent.includes('Strict-Transport-Security'),
    required: true
  },
  {
    name: 'Content-Security-Policy in Next.js',
    test: nextConfigContent.includes('Content-Security-Policy'),
    required: true
  }
];

nextChecks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} ${check.required ? '(REQUIRED)' : ''}`);
    failed++;
  }
});

// Test 3: Verify documentation exists
console.log('\n📋 Test 3: Documentation');
console.log('-'.repeat(60));

const docsPath = path.join(__dirname, '..', 'docs', 'SSL_CERTIFICATE_SETUP.md');
const secretsDocsPath = path.join(__dirname, '..', 'docs', 'SECRETS_MANAGEMENT.md');

const docChecks = [
  {
    name: 'SSL Certificate Setup Guide exists',
    test: fs.existsSync(docsPath),
    required: true
  },
  {
    name: 'SSL docs contain Railway setup',
    test: fs.existsSync(docsPath) &&
          fs.readFileSync(docsPath, 'utf8').includes('Railway Deployment'),
    required: true
  },
  {
    name: 'SSL docs contain Vercel setup',
    test: fs.existsSync(docsPath) &&
          fs.readFileSync(docsPath, 'utf8').includes('Vercel Deployment'),
    required: true
  },
  {
    name: 'Secrets Management Guide exists',
    test: fs.existsSync(secretsDocsPath),
    required: true
  }
];

docChecks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} ${check.required ? '(REQUIRED)' : ''}`);
    failed++;
  }
});

// Test 4: Environment variable validation
console.log('\n📋 Test 4: Environment Configuration');
console.log('-'.repeat(60));

const envExamplePath = path.join(__dirname, '..', '.env.example');
const envContent = fs.existsSync(envExamplePath)
  ? fs.readFileSync(envExamplePath, 'utf8')
  : '';

const envChecks = [
  {
    name: '.env.example exists',
    test: fs.existsSync(envExamplePath),
    required: true
  },
  {
    name: 'NODE_ENV documented',
    test: envContent.includes('NODE_ENV'),
    required: true
  },
  {
    name: 'HTTPS-related variables documented',
    test: envContent.includes('CORS_ALLOWED_ORIGINS') ||
          envContent.includes('FORCE_HTTPS'),
    required: false
  }
];

envChecks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} ${check.required ? '(REQUIRED)' : ''}`);
    failed++;
  }
});

// Test 5: Build verification
console.log('\n📋 Test 5: Build Status');
console.log('-'.repeat(60));

const buildIdPath = path.join(__dirname, '..', '.next', 'BUILD_ID');
const middlewareBuildPath = path.join(__dirname, '..', '.next', 'server', 'src', 'middleware.js');

const buildChecks = [
  {
    name: 'Production build exists',
    test: fs.existsSync(buildIdPath),
    required: true
  },
  {
    name: 'Middleware compiled',
    test: fs.existsSync(middlewareBuildPath),
    required: true
  }
];

buildChecks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
    passed++;
  } else {
    console.log(`❌ ${check.name} ${check.required ? '(REQUIRED)' : ''}`);
    failed++;
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All HTTPS/SSL configuration tests passed!');
  console.log('✅ Issue #14 - HTTPS/SSL Configuration: COMPLETE');
  console.log('\nNext Steps:');
  console.log('1. Deploy to Railway/Vercel');
  console.log('2. Configure custom domain');
  console.log('3. Verify SSL certificate provisioning');
  console.log('4. Run SSL Labs test (https://www.ssllabs.com/ssltest/)');
  console.log('5. Test HTTPS redirect in production');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the configuration.');
  process.exit(1);
}
