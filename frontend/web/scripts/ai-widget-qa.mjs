// Run against a local production server: node scripts/ai-widget-qa.mjs
// Uses fixture responses so visual interaction checks do not require a live AI provider.
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const baseUrl = process.env.YUDING_QA_URL || 'http://localhost:3001';
const executablePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({ executablePath, headless: true });
const page = await browser.newPage();
const conversations = [];
const messages = new Map();
let nextId = 1;
let account = 'QA';
let failCreate = false;

function response(request, body, status = 200) {
  return request.respond({
    status,
    contentType: 'application/json',
    headers: {
      'Access-Control-Allow-Origin': baseUrl,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(body),
  });
}

await page.setRequestInterception(true);
page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.origin !== 'http://localhost:8888') return request.continue();
  if (request.method() === 'OPTIONS') return response(request, {});
  if (url.pathname === '/auth/refresh') return response(request, { accessToken: 'fixture-token' });
  if (url.pathname === '/auth/me') return response(request, {
    id: account,
    email: 'fixture@example.test',
    firstName: account,
    lastName: 'Fixture',
    roles: ['ROLE_USER'],
    isEmailVerified: true,
  });
  if (url.pathname === '/api/ai/conversations' && request.method() === 'GET') {
    return response(request, conversations.filter((item) => item.owner === account).map(({ owner, ...item }) => item));
  }
  if (url.pathname === '/api/ai/conversations' && request.method() === 'POST') {
    if (failCreate) return response(request, { message: 'Service unavailable' }, 503);
    const date = new Date().toISOString();
    const item = { id: `fixture-${nextId++}`, title: 'Nouvelle conversation', status: 'ACTIVE', createdAt: date, updatedAt: date, lastMessageAt: null, owner: account };
    conversations.unshift(item);
    messages.set(item.id, []);
    return response(request, item);
  }
  const match = url.pathname.match(/^\/api\/ai\/conversations\/([^/]+)\/messages$/);
  if (match) {
    const item = conversations.find((conversation) => conversation.id === match[1] && conversation.owner === account);
    return response(request, item ? messages.get(item.id) : { message: 'Not found' }, item ? 200 : 404);
  }
  if (url.pathname === '/api/ai/chat') {
    const payload = JSON.parse(request.postData() || '{}');
    const item = conversations.find((conversation) => conversation.id === payload.conversationId && conversation.owner === account);
    if (!item) return response(request, { message: 'Not found' }, 404);
    if (payload.message.includes('erreur fixture')) return response(request, { message: 'Service unavailable' }, 503);
    const date = new Date().toISOString();
    const userMessage = { id: `message-${nextId++}`, conversationId: item.id, role: 'user', content: payload.message, createdAt: date };
    const assistantMessage = { id: `message-${nextId++}`, conversationId: item.id, role: 'assistant', content: '## Météo Paris\n- **Température** : 23 °C\n- Prix : **120 EUR**\n\n> Conseil Yuding\n\n<img src=x onerror=alert(1)>', createdAt: date, grounded: true, toolsUsed: ['getWeather'] };
    messages.get(item.id).push(userMessage, assistantMessage);
    item.title = payload.message.slice(0, 48);
    item.updatedAt = date;
    item.lastMessageAt = date;
    return response(request, { conversationId: item.id, messageId: assistantMessage.id, role: 'assistant', content: assistantMessage.content, createdAt: date, grounded: true, toolsUsed: ['getWeather'] });
  }
  return response(request, { message: 'Not found' }, 404);
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle0' });
  await page.waitForSelector('button[aria-label="Ouvrir l’assistant Yuding"]');
  const trigger = await page.$('button[aria-label="Ouvrir l’assistant Yuding"]');
  const triggerBox = await trigger.boundingBox();
  assert.ok(triggerBox.width >= 48 && triggerBox.width <= 54);
  await trigger.click();
  await page.waitForSelector('[role="dialog"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Bonjour QA'));
  await page.click('button[aria-label="Fermer l’assistant"]');
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]') || getComputedStyle(document.querySelector('[role="dialog"]')).visibility === 'hidden');
  await page.click('button[aria-label="Ouvrir l’assistant Yuding"]');
  await page.waitForSelector('[role="dialog"]');
  assert.equal(await page.$eval('[role="dialog"] h2', (element) => element.textContent), 'Assistant Yuding');
  const panelEdges = await page.$eval('[role="dialog"]', (panel) => {
    const bounds = panel.getBoundingClientRect();
    return {
      topGap: panel.firstElementChild.getBoundingClientRect().top - bounds.top,
      bottomGap: bounds.bottom - panel.lastElementChild.getBoundingClientRect().bottom,
    };
  });
  assert.ok(panelEdges.topGap <= 2 && panelEdges.bottomGap <= 2, `panel has unwanted outer spacing: ${JSON.stringify(panelEdges)}`);
  assert.equal(await page.$$eval('[aria-label="Idées de questions"] button', (elements) => elements.length), 4);

  await page.click('#yuding-assistant-input');
  await page.keyboard.type('première ligne');
  await page.keyboard.down('Shift');
  await page.keyboard.press('Enter');
  await page.keyboard.up('Shift');
  assert.ok((await page.$eval('#yuding-assistant-input', (element) => element.value)).includes('\n'), 'Shift+Enter adds a line');
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');

  // React's controlled input is exercised with keyboard input.
  await page.click('#yuding-assistant-input');
  await page.keyboard.type('Quel temps fait-il à Paris ?');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Données Yuding vérifiées'));
  assert.equal(await page.$eval('[role="dialog"]', (element) => element.querySelectorAll('img').length), 0, 'AI HTML remains escaped');

  await page.click('button[aria-label="Historique des conversations"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Conversations récentes'));
  assert.equal(await page.$$eval('[role="dialog"] button', (elements) => elements.filter((element) => element.textContent?.includes('Quel temps fait-il')).length), 1);
  assert.ok(await page.$('#yuding-assistant-input'), 'composer remains available in history');
  await page.click('button[aria-label="Nouvelle conversation"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Où souhaitez-vous aller'));
  await page.click('button[aria-label="Historique des conversations"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Conversations récentes'));
  await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((element) => element.textContent?.includes('Quel temps fait-il'))?.click());
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('23 °C'));

  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('button[aria-label="Ouvrir l’assistant Yuding"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('23 °C'));

  await page.click('#yuding-assistant-input');
  await page.keyboard.type('erreur fixture');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[role="dialog"] [role="alert"]')?.textContent?.includes('indisponible'));
  assert.ok(await page.$eval('[role="dialog"] [role="alert"]', (element) => element.textContent.includes('Réessayer')));

  failCreate = true;
  await page.click('button[aria-label="Nouvelle conversation"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"] [role="alert"]')?.textContent?.includes('Nouvelle conversation indisponible'));
  failCreate = false;

  const initialDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  await page.$eval('button[aria-label="Basculer le mode sombre"]', (element) => element.click());
  await page.waitForFunction((previous) => document.documentElement.classList.contains('dark') !== previous, {}, initialDark);
  await page.$eval('button[aria-label="Basculer le mode sombre"]', (element) => element.click());
  await page.waitForFunction((previous) => document.documentElement.classList.contains('dark') === previous, {}, initialDark);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  const duration = await page.$eval('[role="dialog"]', (element) => getComputedStyle(element).transitionDuration);
  assert.ok(duration.includes('1e-05s') || duration.includes('0.00001s'), `reduced motion duration: ${duration}`);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  for (const [width, height] of [[1440, 900], [1366, 768], [1024, 768], [768, 1024], [390, 844], [390, 650]]) {
    await page.setViewport({ width, height });
    const layout = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"]').getBoundingClientRect();
      const trigger = document.querySelector('button[aria-expanded="true"]').getBoundingClientRect();
      const siteHeader = document.querySelector('.yuding-header, .auth-header')?.getBoundingClientRect();
      return { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom, panelHeight: panel.height, headerBottom: siteHeader?.bottom ?? 0, triggerBottom: trigger.bottom, clientWidth: document.documentElement.clientWidth, height: innerHeight, scrolls: [...document.querySelector('[role="dialog"]').children].filter((element) => getComputedStyle(element).overflowY === 'auto').length };
    });
    assert.ok(layout.left >= 0 && layout.right <= layout.clientWidth && layout.top >= 0 && layout.bottom <= layout.height, `panel overflow at ${width}x${height}: ${JSON.stringify(layout)}`);
    assert.ok(layout.top >= layout.headerBottom + 12, `panel overlaps site header at ${width}x${height}: ${JSON.stringify(layout)}`);
    if (width === 1366 && height === 768) assert.ok(layout.top - layout.headerBottom <= 20, `panel too far below site header at ${width}x${height}: ${JSON.stringify(layout)}`);
    if (width > 600) assert.ok(layout.panelHeight <= 540, `desktop panel too tall at ${width}x${height}: ${JSON.stringify(layout)}`);
    assert.equal(layout.scrolls, 1, `one scrolling body at ${width}x${height}`);
    console.log(`✓ ${width}x${height}: ${Math.round(layout.panelHeight)}px panel, ${Math.round(layout.top - layout.headerBottom)}px below header, one scrolling body`);
  }

  account = 'Other';
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('button[aria-label="Ouvrir l’assistant Yuding"]');
  await page.waitForFunction(() => document.querySelector('[role="dialog"]')?.textContent?.includes('Bonjour Other'));
  assert.ok(!(await page.$eval('[role="dialog"]', (element) => element.textContent)).includes('23 °C'), 'old account messages are isolated');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto(`${baseUrl}/hotels`, { waitUntil: 'networkidle0' });
  await page.click('button[aria-label="Ouvrir l’assistant Yuding"]');
  await page.waitForSelector('[role="dialog"]');
  const subpageGap = await page.evaluate(() => document.querySelector('[role="dialog"]').getBoundingClientRect().top - document.querySelector('.yuding-header').getBoundingClientRect().bottom);
  assert.ok(subpageGap >= 12, `panel overlaps the sticky subpage header: ${subpageGap}px`);
  console.log('✓ trigger, open/close, keyboard, welcome, chat, grounded output, XSS escaping, history, new conversation, refresh, errors, themes, reduced motion, and account isolation');
} finally {
  await browser.close();
}
