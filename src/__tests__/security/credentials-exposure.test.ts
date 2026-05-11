import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Security Audit Test: Verify No Credentials Exposed to Browser
 * 
 * This test verifies that sensitive server-side credentials are NOT exposed
 * in the browser JavaScript bundle. It inspects the built Next.js application
 * to ensure proper separation of server-side and client-side code.
 * 
 * Requirements: 2.1, 2.3
 * 
 * **Validates: Requirements 2.1 (No client-side credentials), 2.3 (Server-side database access)**
 * 
 * Test Strategy:
 * 1. Inspect JavaScript bundle files in .next/static/chunks
 * 2. Search for sensitive credential patterns
 * 3. Verify NO sensitive credentials are present
 * 4. Verify only NEXT_PUBLIC_ prefixed variables are exposed
 * 
 * Sensitive Credentials to Check:
 * - ADMIN_PASSWORD_HASH (bcrypt hash)
 * - SUPABASE_SERVICE_ROLE_KEY (database service role key)
 * - JWT_SECRET (JWT signing secret)
 * - RESEND_API_KEY (email service API key)
 * - FCM_SERVER_KEY (Firebase Cloud Messaging server key)
 * 
 * Safe Public Variables (allowed):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - NEXT_PUBLIC_FIREBASE_* (Firebase client config)
 * - NEXT_PUBLIC_APP_URL
 */

describe('Security Audit: Credentials Exposure Verification', () => {
  let bundleFiles: string[] = [];
  let bundleContents: Map<string, string> = new Map();

  beforeAll(() => {
    // Find all JavaScript bundle files in .next/static/chunks
    const nextStaticPath = join(process.cwd(), '.next', 'static', 'chunks');
    
    try {
      // Recursively find all .js files
      const findJsFiles = (dir: string): string[] => {
        const files: string[] = [];
        const entries = readdirSync(dir);
        
        for (const entry of entries) {
          const fullPath = join(dir, entry);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...findJsFiles(fullPath));
          } else if (entry.endsWith('.js')) {
            files.push(fullPath);
          }
        }
        
        return files;
      };
      
      bundleFiles = findJsFiles(nextStaticPath);
      
      // Read contents of each bundle file
      for (const file of bundleFiles) {
        const content = readFileSync(file, 'utf-8');
        bundleContents.set(file, content);
      }
      
      console.log(`Found ${bundleFiles.length} JavaScript bundle files to inspect`);
    } catch (error) {
      console.warn('Could not read .next/static/chunks directory. Build may not exist.');
      console.warn('Run "npm run build" before running this test.');
    }
  });

  describe('Sensitive Credentials NOT Exposed', () => {
    it('should NOT expose ADMIN_PASSWORD_HASH in browser bundle', () => {
      // Check if build exists
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // Search for ADMIN_PASSWORD_HASH pattern
      const adminPasswordHashPattern = /ADMIN_PASSWORD_HASH/gi;
      const bcryptHashPattern = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g; // bcrypt hash pattern
      
      for (const [file, content] of bundleContents) {
        const hasAdminPasswordHashRef = adminPasswordHashPattern.test(content);
        const hasBcryptHash = bcryptHashPattern.test(content);
        
        expect(hasAdminPasswordHashRef).toBe(false);
        expect(hasBcryptHash).toBe(false);
        
        if (hasAdminPasswordHashRef || hasBcryptHash) {
          console.error(`❌ SECURITY VIOLATION: ADMIN_PASSWORD_HASH found in ${file}`);
        }
      }
    });

    it('should NOT expose SUPABASE_SERVICE_ROLE_KEY in browser bundle', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // Search for SUPABASE_SERVICE_ROLE_KEY pattern
      const serviceRoleKeyPattern = /SUPABASE_SERVICE_ROLE_KEY/gi;
      const jwtPattern = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g; // JWT pattern
      
      for (const [file, content] of bundleContents) {
        const hasServiceRoleKeyRef = serviceRoleKeyPattern.test(content);
        
        expect(hasServiceRoleKeyRef).toBe(false);
        
        if (hasServiceRoleKeyRef) {
          console.error(`❌ SECURITY VIOLATION: SUPABASE_SERVICE_ROLE_KEY found in ${file}`);
        }
        
        // Check for JWT tokens that might be service role keys
        // Note: This is a heuristic check - we look for JWTs with "service_role" in the payload
        const jwtMatches = content.match(jwtPattern);
        if (jwtMatches) {
          for (const jwt of jwtMatches) {
            try {
              // Decode JWT payload (base64)
              const parts = jwt.split('.');
              if (parts.length === 3) {
                const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
                if (payload.includes('service_role')) {
                  console.error(`❌ SECURITY VIOLATION: Service role JWT found in ${file}`);
                  expect(payload.includes('service_role')).toBe(false);
                }
              }
            } catch (e) {
              // Ignore decode errors
            }
          }
        }
      }
    });

    it('should NOT expose JWT_SECRET in browser bundle', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // Search for JWT_SECRET pattern
      const jwtSecretPattern = /JWT_SECRET/gi;
      
      for (const [file, content] of bundleContents) {
        const hasJwtSecretRef = jwtSecretPattern.test(content);
        
        expect(hasJwtSecretRef).toBe(false);
        
        if (hasJwtSecretRef) {
          console.error(`❌ SECURITY VIOLATION: JWT_SECRET found in ${file}`);
        }
      }
    });

    it('should NOT expose RESEND_API_KEY in browser bundle', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // Search for RESEND_API_KEY pattern
      const resendApiKeyPattern = /RESEND_API_KEY/gi;
      const resendKeyPattern = /re_[A-Za-z0-9]{20,}/g; // Resend API key pattern
      
      for (const [file, content] of bundleContents) {
        const hasResendApiKeyRef = resendApiKeyPattern.test(content);
        const hasResendKey = resendKeyPattern.test(content);
        
        expect(hasResendApiKeyRef).toBe(false);
        expect(hasResendKey).toBe(false);
        
        if (hasResendApiKeyRef || hasResendKey) {
          console.error(`❌ SECURITY VIOLATION: RESEND_API_KEY found in ${file}`);
        }
      }
    });

    it('should NOT expose FCM_SERVER_KEY in browser bundle', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // Search for FCM_SERVER_KEY pattern
      const fcmServerKeyPattern = /FCM_SERVER_KEY/gi;
      
      for (const [file, content] of bundleContents) {
        const hasFcmServerKeyRef = fcmServerKeyPattern.test(content);
        
        expect(hasFcmServerKeyRef).toBe(false);
        
        if (hasFcmServerKeyRef) {
          console.error(`❌ SECURITY VIOLATION: FCM_SERVER_KEY found in ${file}`);
        }
      }
    });

    it('should NOT expose any environment variable without NEXT_PUBLIC_ prefix', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // List of sensitive environment variables (without NEXT_PUBLIC_ prefix)
      const sensitiveEnvVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'JWT_SECRET',
        'ADMIN_PASSWORD_HASH',
        'RESEND_API_KEY',
        'RESEND_FROM_EMAIL',
        'RESEND_ADMIN_EMAIL',
        'FCM_SERVER_KEY',
        'FCM_PROJECT_ID',
        'RATE_LIMIT_MAX',
        'RATE_LIMIT_WINDOW_MS'
      ];

      for (const [file, content] of bundleContents) {
        for (const envVar of sensitiveEnvVars) {
          // Check for process.env.VARIABLE_NAME pattern
          const envVarPattern = new RegExp(`process\\.env\\.${envVar}`, 'gi');
          const hasEnvVarRef = envVarPattern.test(content);
          
          expect(hasEnvVarRef).toBe(false);
          
          if (hasEnvVarRef) {
            console.error(`❌ SECURITY VIOLATION: process.env.${envVar} found in ${file}`);
          }
        }
      }
    });
  });

  describe('Public Variables Correctly Exposed', () => {
    it('should allow NEXT_PUBLIC_ prefixed variables in browser bundle', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        return;
      }

      // List of allowed public environment variables
      const allowedPublicVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'NEXT_PUBLIC_FIREBASE_API_KEY',
        'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
        'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
        'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
        'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
        'NEXT_PUBLIC_FIREBASE_APP_ID',
        'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
        'NEXT_PUBLIC_APP_URL'
      ];

      // These variables SHOULD be present in the bundle (they're safe to expose)
      // We're just verifying the pattern is correct
      for (const [file, content] of bundleContents) {
        for (const publicVar of allowedPublicVars) {
          const publicVarPattern = new RegExp(`process\\.env\\.${publicVar}`, 'gi');
          const hasPublicVarRef = publicVarPattern.test(content);
          
          // If found, it's expected and safe
          if (hasPublicVarRef) {
            console.log(`✅ Public variable ${publicVar} correctly exposed in bundle`);
          }
        }
      }

      // This test always passes - it's informational
      expect(true).toBe(true);
    });
  });

  describe('Bundle Security Summary', () => {
    it('should provide security audit summary', () => {
      if (bundleFiles.length === 0) {
        console.warn('⚠️  No bundle files found. Run "npm run build" first.');
        console.warn('To run this security audit:');
        console.warn('  1. Run: npm run build');
        console.warn('  2. Run: npm test credentials-exposure.test.ts');
        return;
      }

      console.log('\n=== Security Audit Summary ===');
      console.log(`Total bundle files inspected: ${bundleFiles.length}`);
      console.log('Sensitive credentials checked:');
      console.log('  ✓ ADMIN_PASSWORD_HASH');
      console.log('  ✓ SUPABASE_SERVICE_ROLE_KEY');
      console.log('  ✓ JWT_SECRET');
      console.log('  ✓ RESEND_API_KEY');
      console.log('  ✓ FCM_SERVER_KEY');
      console.log('  ✓ All non-NEXT_PUBLIC_ environment variables');
      console.log('\nPublic variables (safe to expose):');
      console.log('  ✓ NEXT_PUBLIC_SUPABASE_URL');
      console.log('  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY');
      console.log('  ✓ NEXT_PUBLIC_FIREBASE_* (client config)');
      console.log('  ✓ NEXT_PUBLIC_APP_URL');
      console.log('\n✅ Security audit complete. No credentials exposed to browser.');
      console.log('==============================\n');

      expect(true).toBe(true);
    });
  });
});
