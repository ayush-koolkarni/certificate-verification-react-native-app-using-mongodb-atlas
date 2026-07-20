/**
 * Manual implementation of SHA-256
 * For educational use in the Certify Portal project.
 */

// Helper: Right rotate a 32-bit integer
const rotr = (n, x) => (x >>> n) | (x << (32 - n));

// SHA-256 Logical Functions
const Ch = (x, y, z) => (x & y) ^ (~x & z);
const Maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
const Sigma0 = (x) => rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
const Sigma1 = (x) => rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
const sigma0 = (x) => rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
const sigma1 = (x) => rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);

// Initial Hash Values (first 32 bits of the fractional parts of square roots of first 8 primes)
const H = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

// Round Constants (first 32 bits of the fractional parts of cube roots of first 64 primes)
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function manualSha256(message) {
  // Convert string to bit array
  let msg = unescape(encodeURIComponent(message)); 
  let b = [];
  for (let i = 0; i < msg.length; i++) b.push(msg.charCodeAt(i));

  // 1. Preprocessing: Padding
  let l = b.length * 8;
  b.push(0x80);
  while ((b.length * 8 + 64) % 512 !== 0) b.push(0);
  
  // Append length as 64-bit big-endian
  for (let i = 7; i >= 0; i--) b.push((l >>> (i * 8)) & 0xff);

  let hash = [...H];

  // 2. Processing in 512-bit blocks
  for (let i = 0; i < b.length; i += 64) {
    let w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = (b[i + t * 4] << 24) | (b[i + t * 4 + 1] << 16) | (b[i + t * 4 + 2] << 8) | b[i + t * 4 + 3];
    }
    for (let t = 16; t < 64; t++) {
      w[t] = (sigma1(w[t - 2]) + w[t - 7] + sigma0(w[t - 15]) + w[t - 16]) | 0;
    }

    let [a, c, d, e, f, g, h] = hash;
    let b_val = hash[1]; // using b_val to avoid conflict with block b

    // 3. The 64 Rounds
    for (let t = 0; t < 64; t++) {
      let T1 = (h + Sigma1(e) + Ch(e, f, g) + K[t] + w[t]) | 0;
      let T2 = (Sigma0(a) + Maj(a, b_val, c)) | 0;
      h = g; g = f; f = e;
      e = (d + T1) | 0;
      d = c; c = b_val; b_val = a;
      a = (T1 + T2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b_val) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  // 4. Result: Convert to Hex string
  return hash.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

module.exports = manualSha256;