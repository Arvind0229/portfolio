#!/usr/bin/env node
/**
 * Prints a fresh set of admin secrets and the exact lines to paste.
 *
 * Run once, when setting the deployed site up:
 *
 *     npm run admin:secret
 *
 * Nothing is written to disk and nothing is sent anywhere — the values are
 * printed and then forgotten by this process. That is deliberate. A script that
 * helpfully wrote them into `.env.local` would be a script that eventually
 * writes them into a file somebody commits.
 */
import { createHmac, randomBytes } from 'node:crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += BASE32[(value >>> bits) & 31];
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const char of input.toUpperCase().replace(/=+$/, '')) {
    value = (value << 5) | BASE32.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((value >>> bits) & 0xff);
    }
  }
  return Buffer.from(out);
}

function code(secret, counter) {
  const buffer = Buffer.alloc(8);
  buffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buffer.writeUInt32BE(counter >>> 0, 4);
  const digest = createHmac('sha1', base32Decode(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, '0');
}

const totpSecret = base32Encode(randomBytes(20));
const sessionSecret = randomBytes(32).toString('base64url');
const account = process.argv[2] ?? 'arvind';
const issuer = 'Arvind Gupta Portfolio';
const uri = `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${totpSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

const grouped = totpSecret.match(/.{1,4}/g).join(' ');

console.log(`
Admin sign-in setup
===================

1. Open Google Authenticator (or Authy, or 1Password) on your phone.
   Choose "Enter a setup key" / "Enter code manually" and type:

       Account   ${issuer} (${account})
       Key       ${grouped}
       Type      Time based

   If your app can open a link instead, this is the same thing:

       ${uri}

2. Put these two lines in your hosting provider's environment variables
   (on Vercel: Project → Settings → Environment Variables). Never commit them.

       ADMIN_TOTP_SECRET=${totpSecret}
       ADMIN_SESSION_SECRET=${sessionSecret}

3. To let the live site save your edits, add these as well. Create the token at
   github.com/settings/personal-access-tokens with access to this repository
   only, and Contents: Read and write — nothing else.

       ADMIN_GITHUB_REPO=your-username/your-repo
       ADMIN_GITHUB_TOKEN=github_pat_...
       ADMIN_GITHUB_BRANCH=main

4. Check the app is in step. Right now it should be showing:

       ${code(totpSecret, Math.floor(Date.now() / 1000 / 30))}

   If it shows something else, the phone's clock is off — turn on automatic
   date and time and try again.

Losing the secret locks you out of the live admin page and nothing else: the
site keeps working, and you can always set a new one here and redeploy.
On your own laptop the admin page never asks for a code at all.
`);
