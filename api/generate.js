const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

const CHROMIUM_URL = 'https://github.com/nicholasgriffintn/chromium-binaries/releases/download/v131.0.0/chromium-v131.0.0-pack.tar';

const ALLOWED_DOMAINS = ['compras.arquipro.com.br', 'localhost'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url, filename } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  try {
    const urlObj = new URL(url);
    if (!ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      return res.status(403).json({ error: 'Domínio não permitido' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'URL inválida' });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(CHROMIUM_URL),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename || 'documento.pdf'}"`);
    return res.send(pdf);
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ error: error.message });
  }
};
