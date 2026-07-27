import pako from "pako";

// Spreading the whole array into String.fromCharCode(...) blows the
// call-argument limit and throws RangeError once a tree is large enough,
// so build the binary string in chunks instead.
const CHUNK_SIZE = 0x8000;

export function gzipBase64(text: string): string {
  const gzipped = pako.gzip(text);
  let binary = "";
  for (let i = 0; i < gzipped.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...gzipped.subarray(i, i + CHUNK_SIZE));
  }
  return btoa(binary);
}
