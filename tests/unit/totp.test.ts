import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  totpUri,
  verifyTotp,
} from '@/lib/admin/totp';

/**
 * The RFC 6238 test vectors.
 *
 * This is the reason it was defensible to implement TOTP rather than install
 * it. The published vectors are an external, authoritative oracle: if the
 * implementation matches them it is correct against the same standard every
 * authenticator app implements, which is a stronger statement than any amount
 * of self-consistent testing — and stronger than trusting a package version.
 *
 * Appendix B states the seed as the ASCII string "12345678901234567890",
 * extended by repetition for the wider hashes, and the codes as eight digits.
 */
const SEED_SHA1 = Buffer.from('12345678901234567890', 'ascii');
const SEED_SHA256 = Buffer.from('12345678901234567890123456789012', 'ascii');
const SEED_SHA512 = Buffer.from(
  '1234567890123456789012345678901234567890123456789012345678901234',
  'ascii',
);

const VECTORS = [
  { time: 59, sha1: '94287082', sha256: '46119246', sha512: '90693936' },
  { time: 1111111109, sha1: '07081804', sha256: '68084774', sha512: '25091201' },
  { time: 1111111111, sha1: '14050471', sha256: '67062674', sha512: '99943326' },
  { time: 1234567890, sha1: '89005924', sha256: '91819424', sha512: '93441116' },
  { time: 2000000000, sha1: '69279037', sha256: '90698825', sha512: '38618901' },
  { time: 20000000000, sha1: '65353130', sha256: '77737706', sha512: '47863826' },
];

describe('TOTP against the RFC 6238 vectors', () => {
  it.each(VECTORS)('matches at T=$time', ({ time, sha1, sha256, sha512 }) => {
    const counter = Math.floor(time / 30);
    expect(hotp(SEED_SHA1, counter, 8, 'sha1')).toBe(sha1);
    expect(hotp(SEED_SHA256, counter, 8, 'sha256')).toBe(sha256);
    expect(hotp(SEED_SHA512, counter, 8, 'sha512')).toBe(sha512);
  });
});

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    for (const sample of ['', 'a', 'ab', 'abc', 'abcd', 'abcde', 'hello world']) {
      const buffer = Buffer.from(sample, 'utf8');
      expect(base32Decode(base32Encode(buffer)).toString('utf8')).toBe(sample);
    }
  });

  it('decodes the RFC 4648 examples', () => {
    expect(base32Decode('MZXW6===').toString('utf8')).toBe('foo');
    expect(base32Decode('MZXW6YTBOI======').toString('utf8')).toBe('foobar');
  });

  it('tolerates lower case and spacing, because that is how people type it', () => {
    expect(base32Decode('mzxw 6ytb oi').toString('utf8')).toBe('foobar');
  });

  it('rejects a character that is not in the alphabet', () => {
    expect(() => base32Decode('MZXW6YTB01')).toThrow(/base32/i);
  });
});

describe('verifyTotp', () => {
  const secret = base32Encode(SEED_SHA1);
  // A fixed instant, so the test cannot become flaky as a real clock crosses a
  // 30-second boundary mid-run.
  const now = 1_700_000_000_000;
  const codeNow = hotp(SEED_SHA1, Math.floor(now / 1000 / 30));

  it('accepts the current code', () => {
    expect(verifyTotp(codeNow, secret, now)).toBe(true);
  });

  it('accepts one step of clock skew in both directions', () => {
    expect(verifyTotp(codeNow, secret, now + 30_000)).toBe(true);
    expect(verifyTotp(codeNow, secret, now - 30_000)).toBe(true);
  });

  it('rejects a code two steps stale', () => {
    // The boundary that matters: a code someone read over a shoulder a minute
    // ago must be dead. If this ever passes, the acceptance window widened.
    expect(verifyTotp(codeNow, secret, now + 90_000)).toBe(false);
    expect(verifyTotp(codeNow, secret, now - 90_000)).toBe(false);
  });

  it('rejects a wrong code', () => {
    expect(verifyTotp('000000', secret, now)).toBe(false);
  });

  it('rejects anything that is not six digits', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56 78', '12345a']) {
      expect(verifyTotp(bad, secret, now), `accepted ${JSON.stringify(bad)}`).toBe(false);
    }
  });

  it('tolerates the spaces authenticator apps display', () => {
    expect(verifyTotp(`${codeNow.slice(0, 3)} ${codeNow.slice(3)}`, secret, now)).toBe(true);
  });

  it('returns false rather than throwing on a malformed secret', () => {
    // A misconfigured server must fail the login quietly. Throwing here would
    // surface a stack trace or a 500 that tells an attacker the difference
    // between "wrong code" and "no secret configured".
    expect(verifyTotp(codeNow, '!!!not-base32!!!', now)).toBe(false);
    expect(verifyTotp(codeNow, '', now)).toBe(false);
  });
});

describe('secret generation and provisioning', () => {
  it('generates a 160-bit secret', () => {
    const secret = generateTotpSecret();
    expect(base32Decode(secret)).toHaveLength(20);
  });

  it('generates a different secret every time', () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateTotpSecret()));
    expect(secrets.size).toBe(20);
  });

  it('builds an otpauth URI an authenticator app can read', () => {
    const uri = totpUri('JBSWY3DPEHPK3PXP', 'arvind');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
    expect(uri).toContain('algorithm=SHA1');
    // The issuer belongs in the label as well as the query, or the entry shows
    // up in the app as a bare account name among everything else there.
    expect(decodeURIComponent(uri)).toContain('Arvind Gupta Portfolio:arvind');
  });

  it('produces a secret that verifies end to end', () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const code = hotp(base32Decode(secret), Math.floor(now / 1000 / 30));
    expect(verifyTotp(code, secret, now)).toBe(true);
  });
});
