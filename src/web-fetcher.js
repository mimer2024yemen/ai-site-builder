/**
 * Web Fetcher - جلب المواقع وتحليلها
 * يقوم بـ Reverse Engineering للمواقع
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * جلب محتوى URL
 */
async function fetchURL(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const timeout = options.timeout || 15000;
    const maxRedirects = options.maxRedirects || 5;
    let redirects = 0;

    function doFetch(url) {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const req = client.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'identity',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout
      }, (res) => {
        // Handle redirects
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (redirects >= maxRedirects) {
            reject(new Error('Too many redirects'));
            return;
          }
          redirects++;
          const nextUrl = new URL(res.headers.location, url).href;
          doFetch(nextUrl);
          return;
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            url: url,
            finalUrl: url
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    }

    doFetch(targetUrl);
  });
}

/**
 * تحليل HTML واستخراج الملفات
 */
function analyzeHTML(html, baseUrl) {
  const result = {
    title: '',
    meta: {},
    styles: [],
    scripts: [],
    links: [],
    images: [],
    fonts: [],
    inlineCSS: '',
    inlineJS: ''
  };

  // استخراج العنوان
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (titleMatch) result.title = titleMatch[1].trim();

  // استخراج Meta tags
  const metaMatches = html.matchAll(/<meta[^>]+>/gis);
  for (const m of metaMatches) {
    const tag = m[0];
    const nameMatch = tag.match(/name=["']([^"']+)/i);
    const contentMatch = tag.match(/content=["']([^"']+)/i);
    if (nameMatch && contentMatch) {
      result.meta[nameMatch[1]] = contentMatch[1];
    }
  }

  // استخراج CSS files
  const cssMatches = html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gis);
  for (const m of cssMatches) {
    result.styles.push(resolveURL(m[1], baseUrl));
  }

  // استخراج JavaScript files
  const jsMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gis);
  for (const m of jsMatches) {
    result.scripts.push(resolveURL(m[1], baseUrl));
  }

  // استخراج الصور
  const imgMatches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gis);
  for (const m of imgMatches) {
    result.images.push(resolveURL(m[1], baseUrl));
  }

  // استخراج Inline CSS
  const inlineStyleMatches = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gis);
  for (const m of inlineStyleMatches) {
    result.inlineCSS += m[1] + '\n';
  }

  // استخراج Inline JavaScript
  const inlineJsMatches = html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gis);
  for (const m of inlineJsMatches) {
    if (m[1].trim()) {
      result.inlineJS += m[1] + '\n';
    }
  }

  // استخراج الخطوط
  const fontMatches = html.matchAll(/url\(["']?([^"')]+\.(woff2?|ttf|otf|eot))["']?\)/gis);
  for (const m of fontMatches) {
    result.fonts.push(resolveURL(m[1], baseUrl));
  }

  return result;
}

/**
 * تحويل URL نسبي إلى مطلق
 */
function resolveURL(url, base) {
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * جلب ملفات CSS وتحليلها
 */
async function fetchCSSFiles(cssUrls) {
  const results = [];
  for (const url of cssUrls.slice(0, 10)) { // حد أقصى 10 ملفات
    try {
      const res = await fetchURL(url, { timeout: 10000 });
      if (res.status === 200) {
        results.push({ url, content: res.body, size: res.body.length });
      }
    } catch (e) {
      // تجاهل الأخطاء
    }
  }
  return results;
}

/**
 * تجميع معلومات الموقع
 */
async function analyzeWebsite(targetUrl) {
  try {
    // جلب الصفحة الرئيسية
    const mainPage = await fetchURL(targetUrl);

    if (mainPage.status !== 200) {
      return {
        success: false,
        error: `HTTP ${mainPage.status}`,
        message: 'لا يمكن الوصول للموقع'
      };
    }

    // تحليل HTML
    const analysis = analyzeHTML(mainPage.body, targetUrl);

    // جلب ملفات CSS
    const cssFiles = await fetchCSSFiles(analysis.styles);

    return {
      success: true,
      url: targetUrl,
      title: analysis.title,
      meta: analysis.meta,
      html: mainPage.body,
      htmlSize: mainPage.body.length,
      cssFiles: cssFiles,
      cssCount: cssFiles.length,
      jsCount: analysis.scripts.length,
      imageCount: analysis.images.length,
      inlineCSS: analysis.inlineCSS,
      inlineJS: analysis.inlineJS,
      styles: analysis.styles,
      scripts: analysis.scripts,
      images: analysis.images.slice(0, 20), // حد أقصى 20 صورة
      fonts: analysis.fonts
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'فشل في جلب الموقع'
    };
  }
}

module.exports = {
  fetchURL,
  analyzeHTML,
  analyzeWebsite,
  fetchCSSFiles,
  resolveURL
};
