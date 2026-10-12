import {webURL} from './download-sources.js';

export const VIKING_PREFIX = 'https://vikingfile.com/d/';

function entity(text) {
  return text.replace(/&(?:amp|quot|apos|lt|gt|#39|#(\d+)|#x([a-f0-9]+));/gi, (all, decimal, hex) => {
    if (decimal || hex) {
      const code = parseInt(decimal || hex, decimal ? 10 : 16);
      return code <= 1114111 ? String.fromCodePoint(code) : all;
    }
    return (
      {'&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>'}[
        all.toLowerCase()
      ] ?? all
    );
  });
}

function element(html, id) {
  const pattern = new RegExp(
    `<([a-z][a-z0-9]*)\\b[^>]*\\bid=["']${id}["'][^>]*>([\\s\\S]*?)<\\/\\1\\s*>`,
    'i'
  );
  return entity(
    pattern
      .exec(html)?.[2]
      .replace(/<[^>]*>/g, '')
      .trim() || ''
  );
}

function vikingMetadata(html, expectedBytes) {
  const filename = element(html, 'filename');
  if (
    !filename ||
    encodeURIComponent(filename).replace(/%[a-f0-9]{2}|./gi, 'x').length > 160 ||
    /[\/\\\x00-\x1f\x7f]/.test(filename) ||
    filename.includes('..')
  )
    throw new Error('Vikingfile did not expose a usable filename. Enter the final file link.');
  const size = /^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/i.exec(element(html, 'size'));
  if (!size && !expectedBytes)
    throw new Error('Vikingfile did not expose a file size. Enter the final file link.');
  return {
    filename,
    expectedBytes: expectedBytes || null,
    displaySize: size
      ? {value: Number(size[1]), precision: (size[1].split('.')[1] || '').length, unit: size[2].toUpperCase()}
      : null
  };
}

function matchingVikingURL(url, filename) {
  try {
    webURL(url);
    if (!url.startsWith(VIKING_PREFIX)) return false;
    const path = url.slice(VIKING_PREFIX.length);
    return /^[a-z0-9]{10}\/[^/?#]+$/i.test(path) && decodeURIComponent(path.slice(11)) === filename;
  } catch {
    return false;
  }
}

function matchingSize(bytes, metadata) {
  if (metadata.expectedBytes) return bytes === metadata.expectedBytes;
  const {value, precision, unit} = metadata.displaySize;
  const power = {B: 0, KB: 1, KIB: 1, MB: 2, MIB: 2, GB: 3, GIB: 3, TB: 4, TIB: 4}[unit];
  return (unit.includes('I') ? [1024] : [1e3, 1024]).some(
    base => Math.abs(bytes / base ** power - value) <= 0.5 * 10 ** -precision
  );
}

function transferURL(url) {
  const parsed = webURL(url);
  if (
    !url.startsWith('https://') ||
    parsed.origin !== `https://${parsed.host}` ||
    parsed.path.includes('#') ||
    !(
      ['vikingfile.com', 'ar.vikingfile.com'].includes(parsed.host) ||
      parsed.host.endsWith('.s3.bhs.io.cloud.ovh.net') ||
      parsed.host.endsWith('.r2.cloudflarestorage.com')
    )
  )
    throw new Error('Captured file redirected to an unsupported download host.');
  return url;
}

async function rangeProbe(http, url, signal) {
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await http.request(transferURL(url), {
      method: 'GET',
      headers: {Range: 'bytes=0-0'},
      signal,
      maxBytes: 8192,
      followRedirects: false
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers?.location;
    if (!location || redirects === 5) throw new Error('Captured file exceeded its redirect limit.');
    url = location.startsWith('/') && !location.startsWith('//') ? webURL(url).origin + location : location;
  }
}

export async function validateVikingCapture(http, url, metadata, signal) {
  if (!matchingVikingURL(url, metadata.filename))
    throw new Error('Captured link does not match the selected file.');
  const response = await rangeProbe(http, url, signal);
  const range = /^bytes 0-0\/(\d+)$/i.exec(response.headers?.['content-range'] || '');
  const bytes = Number(range?.[1]);
  if (
    !response.ok ||
    response.status !== 206 ||
    Number(response.headers?.['content-length']) !== 1 ||
    /html|json|xml|text\//i.test(response.headers?.['content-type'] || '') ||
    (await response.text()).length !== 1 ||
    !Number.isSafeInteger(bytes) ||
    bytes <= 0 ||
    !matchingSize(bytes, metadata)
  )
    throw new Error('Captured file failed validation or expired. Reopen the page and retry.');
  const disposition = response.headers?.['content-disposition'];
  if (disposition) {
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const plain = /filename=(?:"([^"]+)"|([^;]+))/i.exec(disposition);
    const filename = encoded ? decodeURIComponent(encoded) : plain?.[1] || plain?.[2]?.trim();
    if (filename && filename !== metadata.filename)
      throw new Error('Captured response names a different file.');
  }
  const etag = response.headers?.etag;
  if (
    !/^"[^"\x00-\x20\x7f]*"$/.test(etag || '') &&
    !Number.isFinite(Date.parse(response.headers?.['last-modified'] || ''))
  )
    throw new Error('Captured file has no stable identity. Reopen the page and retry.');
  return {url, expectedBytes: bytes};
}

export async function describeVikingCapture(http, release, signal) {
  const url = release.browserUrl || release.url;
  const page = webURL(url);
  if (!['vikingfile.com', 'vik1ngfile.site'].includes(page.host) || !/^\/f\/[a-z0-9]{10}$/i.test(page.path))
    throw new Error('Unsupported Vikingfile page. Enter the final file link.');
  const response = await http.request(url, {signal, maxBytes: 1024 * 1024});
  if (!response.ok)
    throw new Error(`Vikingfile metadata HTTP ${response.status}. Enter the final file link.`);
  return vikingMetadata(await response.text(), release.sizeBytes);
}
