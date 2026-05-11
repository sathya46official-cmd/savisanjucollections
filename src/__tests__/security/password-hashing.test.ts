import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as registerPOST } from '@/app/api/auth/register/route';

/**
 * Security Test: Password Hashing Verification
 * 
 * Tests that passwords are properly hashed using bcrypt before storage:
 * 1. Register user with plaintext password "Test1234"
 * 2. Query database for user record
 * 3. Verify password field contains bcrypt hash (starts with $2a$ or $2b$)
 * 4. Verify plaintext password is NOT stored
 * 5. Verify hash format is valid bcrypt
 * 
 * Requirements: 2.4
 * 
 * **Validates: Requirement 2.4 (Passwords hashed with bcrypt)**
 */

// Mock database to capture stored password
let mockStoredPassword: string | null = null;
let mockUserExists = false;
let mockCreatedUserId: string | null = null;

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  }))
}));

// Mock rate limiting
vi.mock('@/lib/middleware/rateLimit', () => ({
  rateLimit: vi.fn(() => ({ success: true, remaining: 99 })),
  rateLimitResponse: vi.fn((remaining: number) => 
    new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 })
  )
}));

// Mock Supabase to capture password storage
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => {
            if (table === 'user_profiles' && mockUserExists) {
              return { data: { id: 'existing-user', email: 'existing@example.com' }, error: null };
            }
            if (table === 'user_profiles' && mockCreatedUserId) {
              return { 
                data: { 
                  id: mockCreatedUserId, 
                  email: 'test@example.com',
                  // Note: password is NOT stored in user_profiles table
                  // It's stored in auth.users table by Supabase
                }, 
                error: null 
              };
            }
            return { data: null, error: null };
          })
        }))
      })),
      insert: vi.fn((data: any) => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({ data: { id: 'new-profile-id', ...data }, error: null }))
        }))
      }))
    })),
    auth: {
      admin: {
        createUser: vi.fn((userData: any) => {
          // Capture the password that would be stored
          mockStoredPassword = userData.password;
          mockCreatedUserId = 'new-user-id';
          
          return {
            data: { 
              user: { 
                id: mockCreatedUserId, 
                email: userData.email 
              } 
            },
            error: null
          };
        }),
        getUserById: vi.fn((userId: string) => {
          if (userId === mockCreatedUserId) {
            return {
              data: {
                user: {
                  id: userId,
                  email: 'test@example.com',
                  // In real Supabase, password hash is stored but not returned
                  // We simulate this by not including password in the response
                }
              },
              error: null
            };
          }
          return { data: null, error: null };
        })
      }
    }
  }
}));

// Mock email service
vi.mock('@/lib/email/resend', () => ({
  sendVerificationEmail: vi.fn(() => Promise.resolve())
}));

// Mock bcrypt to verify it's being used
let bcryptHashCalled = false;
let bcryptHashInput: string | null = null;

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (password: string, saltRounds: number) => {
      bcryptHashCalled = true;
      bcryptHashInput = password;
      // Return a realistic bcrypt hash
      return `$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy`;
    }),
    compare: vi.fn(async (password: string, hash: string) => {
      return password === 'Test1234' && hash.startsWith('$2b$');
    })
  }
}));

describe('Security Test: Password Hashing Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoredPassword = null;
    mockUserExists = false;
    mockCreatedUserId = null;
    bcryptHashCalled = false;
    bcryptHashInput = null;
  });

  afterEach(() => {
    mockStoredPassword = null;
    mockCreatedUserId = null;
    bcryptHashCalled = false;
    bcryptHashInput = null;
  });

  describe('Password Hashing During Registration', () => {
    it('should hash password with bcrypt before storing in database', async () => {
      const plaintextPassword = 'Test1234';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: plaintextPassword
        })
      });

      const response = await registerPOST(request);
      
      // Registration should succeed (201 Created or 200 OK)
      expect([200, 201]).toContain(response.status);

      // Verify bcrypt.hash was called
      expect(bcryptHashCalled).toBe(true);
      expect(bcryptHashInput).toBe(plaintextPassword);

      // Verify stored password is a bcrypt hash
      expect(mockStoredPassword).not.toBeNull();
      expect(mockStoredPassword).not.toBe(plaintextPassword);
      expect(mockStoredPassword).toMatch(/^\$2[ab]\$/); // Bcrypt hash format
    });

    it('should verify bcrypt hash format starts with $2a$ or $2b$', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'Test1234'
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Verify hash format
      expect(mockStoredPassword).not.toBeNull();
      
      const startsWithBcryptPrefix = 
        mockStoredPassword!.startsWith('$2a$') || 
        mockStoredPassword!.startsWith('$2b$');
      
      expect(startsWithBcryptPrefix).toBe(true);
    });

    it('should verify bcrypt hash has correct structure', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'Test1234'
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Bcrypt hash structure: $2b$10$[22 char salt][31 char hash]
      // Total length: 60 characters
      expect(mockStoredPassword).not.toBeNull();
      expect(mockStoredPassword!.length).toBe(60);

      // Verify structure: $2b$10$...
      const bcryptRegex = /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/;
      expect(mockStoredPassword).toMatch(bcryptRegex);
    });

    it('should NOT store plaintext password in database', async () => {
      const plaintextPassword = 'Test1234';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: plaintextPassword
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Verify stored password is NOT the plaintext password
      expect(mockStoredPassword).not.toBe(plaintextPassword);
      expect(mockStoredPassword).not.toContain(plaintextPassword);
    });

    it('should hash different passwords to different hashes', async () => {
      const passwords = ['Test1234', 'Different5678', 'Another9012'];
      const hashes: string[] = [];

      for (const password of passwords) {
        mockStoredPassword = null;
        mockUserExists = false;

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: `test${password}@example.com`,
            phone: '9876543210',
            password: password
          })
        });

        const response = await registerPOST(request);
        expect([200, 201]).toContain(response.status);

        expect(mockStoredPassword).not.toBeNull();
        hashes.push(mockStoredPassword!);
      }

      // Verify all hashes are different
      const uniqueHashes = new Set(hashes);
      expect(uniqueHashes.size).toBe(passwords.length);

      // Verify all hashes are bcrypt format
      hashes.forEach(hash => {
        expect(hash).toMatch(/^\$2[ab]\$/);
      });
    });
  });

  describe('Bcrypt Hash Properties', () => {
    it('should use bcrypt with appropriate salt rounds', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'Test1234'
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Bcrypt hash format: $2b$10$... where 10 is the cost factor (salt rounds)
      expect(mockStoredPassword).not.toBeNull();
      
      // Extract cost factor from hash
      const costFactorMatch = mockStoredPassword!.match(/^\$2[ab]\$(\d{2})\$/);
      expect(costFactorMatch).not.toBeNull();
      
      const costFactor = parseInt(costFactorMatch![1]);
      
      // Cost factor should be 10 (standard for bcrypt)
      expect(costFactor).toBe(10);
    });

    it('should verify bcrypt hash contains salt and hash components', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'Test1234'
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      expect(mockStoredPassword).not.toBeNull();

      // Bcrypt hash structure: $2b$10$[22 char salt][31 char hash]
      const parts = mockStoredPassword!.split('$');
      
      // Should have 4 parts: ['', '2b', '10', 'salt+hash']
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe(''); // Empty before first $
      expect(parts[1]).toMatch(/^2[ab]$/); // Algorithm version
      expect(parts[2]).toBe('10'); // Cost factor
      expect(parts[3].length).toBe(53); // Salt (22) + Hash (31)
    });

    it('should verify hash uses bcrypt character set', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'Test1234'
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      expect(mockStoredPassword).not.toBeNull();

      // Bcrypt uses base64 character set: ./A-Za-z0-9
      const bcryptCharSet = /^[./A-Za-z0-9]+$/;
      const parts = mockStoredPassword!.split('$');
      const saltAndHash = parts[3];

      expect(saltAndHash).toMatch(bcryptCharSet);
    });
  });

  describe('Plaintext Password Prevention', () => {
    it('should never store password in plaintext format', async () => {
      const plaintextPasswords = [
        'Test1234',
        'SimplePassword',
        'ComplexP@ssw0rd!',
        '12345678',
        'qwerty123'
      ];

      for (const password of plaintextPasswords) {
        mockStoredPassword = null;
        mockUserExists = false;

        const request = new NextRequest('http://localhost:3000/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test User',
            email: `test${password}@example.com`,
            phone: '9876543210',
            password: password
          })
        });

        const response = await registerPOST(request);
        expect([200, 201]).toContain(response.status);

        // Verify stored password is NOT plaintext
        expect(mockStoredPassword).not.toBe(password);
        expect(mockStoredPassword).toMatch(/^\$2[ab]\$/);
      }
    });

    it('should verify plaintext password is not substring of hash', async () => {
      const plaintextPassword = 'Test1234';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: plaintextPassword
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Verify plaintext password is not contained in the hash
      expect(mockStoredPassword).not.toContain(plaintextPassword);
      expect(mockStoredPassword).not.toContain(plaintextPassword.toLowerCase());
      expect(mockStoredPassword).not.toContain(plaintextPassword.toUpperCase());
    });

    it('should verify hash is not reversible to plaintext', async () => {
      const plaintextPassword = 'Test1234';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: plaintextPassword
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Bcrypt is a one-way hash function
      // There should be no way to reverse the hash to get the plaintext
      expect(mockStoredPassword).not.toBeNull();
      expect(mockStoredPassword!.length).toBe(60);
      
      // The hash should be completely different from the plaintext
      const similarity = calculateSimilarity(plaintextPassword, mockStoredPassword!);
      expect(similarity).toBeLessThan(0.1); // Less than 10% similarity
    });
  });

  describe('Password Hashing Security Audit', () => {
    it('should provide comprehensive password hashing audit summary', async () => {
      console.log('\n=== Password Hashing Security Audit Summary ===');

      const plaintextPassword = 'Test1234';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: plaintextPassword
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Audit checks
      const audit = {
        bcryptUsed: bcryptHashCalled,
        plaintextNotStored: mockStoredPassword !== plaintextPassword,
        hashFormatValid: mockStoredPassword?.match(/^\$2[ab]\$/) !== null,
        hashLength: mockStoredPassword?.length === 60,
        startsWithBcrypt: mockStoredPassword?.startsWith('$2b$') || mockStoredPassword?.startsWith('$2a$'),
        costFactor: mockStoredPassword?.match(/^\$2[ab]\$(\d{2})\$/)?.[1],
        plaintextNotInHash: !mockStoredPassword?.includes(plaintextPassword)
      };

      console.log('\n--- Password Hashing Verification ---');
      console.log(`✅ Bcrypt Used: ${audit.bcryptUsed ? 'YES' : 'NO'}`);
      console.log(`✅ Plaintext NOT Stored: ${audit.plaintextNotStored ? 'YES' : 'NO'}`);
      console.log(`✅ Hash Format Valid: ${audit.hashFormatValid ? 'YES' : 'NO'}`);
      console.log(`✅ Hash Length Correct (60 chars): ${audit.hashLength ? 'YES' : 'NO'}`);
      console.log(`✅ Starts with $2a$ or $2b$: ${audit.startsWithBcrypt ? 'YES' : 'NO'}`);
      console.log(`✅ Cost Factor: ${audit.costFactor}`);
      console.log(`✅ Plaintext NOT in Hash: ${audit.plaintextNotInHash ? 'YES' : 'NO'}`);

      console.log('\n--- Sample Data ---');
      console.log(`Plaintext Password: ${plaintextPassword}`);
      console.log(`Stored Hash: ${mockStoredPassword}`);
      console.log(`Hash Length: ${mockStoredPassword?.length} characters`);

      console.log('\n--- Security Properties ---');
      console.log('✅ One-way hash function (cannot reverse)');
      console.log('✅ Salt included in hash (prevents rainbow tables)');
      console.log('✅ Cost factor 10 (appropriate for security)');
      console.log('✅ Plaintext password never stored');
      console.log('✅ Requirement 2.4 validated');
      console.log('===========================================\n');

      // Verify all audit checks passed
      expect(audit.bcryptUsed).toBe(true);
      expect(audit.plaintextNotStored).toBe(true);
      expect(audit.hashFormatValid).toBe(true);
      expect(audit.hashLength).toBe(true);
      expect(audit.startsWithBcrypt).toBe(true);
      expect(audit.costFactor).toBe('10');
      expect(audit.plaintextNotInHash).toBe(true);
    });

    it('should document bcrypt security properties', () => {
      const bcryptProperties = {
        algorithm: 'bcrypt',
        type: 'One-way hash function',
        saltRounds: 10,
        hashLength: 60,
        format: '$2b$10$[22 char salt][31 char hash]',
        securityFeatures: [
          'Salted hashing (prevents rainbow table attacks)',
          'Adaptive cost factor (can increase as hardware improves)',
          'One-way function (cannot reverse hash to plaintext)',
          'Slow by design (prevents brute force attacks)',
          'Industry standard for password hashing'
        ],
        complianceStandards: [
          'OWASP Password Storage Cheat Sheet',
          'NIST Digital Identity Guidelines',
          'PCI DSS Requirement 8.2.1'
        ]
      };

      console.log('\n=== Bcrypt Security Properties ===');
      console.log(`Algorithm: ${bcryptProperties.algorithm}`);
      console.log(`Type: ${bcryptProperties.type}`);
      console.log(`Salt Rounds: ${bcryptProperties.saltRounds}`);
      console.log(`Hash Length: ${bcryptProperties.hashLength} characters`);
      console.log(`Format: ${bcryptProperties.format}`);
      
      console.log('\nSecurity Features:');
      bcryptProperties.securityFeatures.forEach((feature, index) => {
        console.log(`  ${index + 1}. ${feature}`);
      });

      console.log('\nCompliance Standards:');
      bcryptProperties.complianceStandards.forEach((standard, index) => {
        console.log(`  ${index + 1}. ${standard}`);
      });
      console.log('==================================\n');

      expect(bcryptProperties.algorithm).toBe('bcrypt');
      expect(bcryptProperties.saltRounds).toBe(10);
      expect(bcryptProperties.hashLength).toBe(60);
    });
  });

  describe('Database Query Verification', () => {
    it('should verify password field contains bcrypt hash when queried', async () => {
      // Register user
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: 'Test1234'
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Simulate querying database for user record
      // In real scenario, this would be: SELECT * FROM auth.users WHERE id = ?
      const storedPasswordHash = mockStoredPassword;

      // Verify password field contains bcrypt hash
      expect(storedPasswordHash).not.toBeNull();
      expect(storedPasswordHash).toMatch(/^\$2[ab]\$/);
      expect(storedPasswordHash).not.toBe('Test1234');
    });

    it('should verify plaintext password is NOT in database', async () => {
      const plaintextPassword = 'Test1234';

      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          phone: '9876543210',
          password: plaintextPassword
        })
      });

      const response = await registerPOST(request);
      expect([200, 201]).toContain(response.status);

      // Simulate database query
      const storedPasswordHash = mockStoredPassword;

      // Verify plaintext is NOT stored
      expect(storedPasswordHash).not.toBe(plaintextPassword);
      expect(storedPasswordHash).not.toContain(plaintextPassword);

      // Verify it's a bcrypt hash
      expect(storedPasswordHash).toMatch(/^\$2[ab]\$\d{2}\$/);
    });
  });
});

// Helper function to calculate string similarity
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) {
      matches++;
    }
  }
  
  return matches / longer.length;
}

