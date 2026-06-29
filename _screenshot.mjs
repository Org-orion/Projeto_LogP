import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });

// Read credentials from .env.local
const env = readFileSync('.env.local', 'utf8');
const email = env.match(/NEXT_PUBLIC_ADMIN_EMAIL=(.+)/)?.[1]?.trim()
  || 'admin@concrem.com.br';

// Go to app
await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
await page.screenshot({ path: '_ss_login.png' });

// Try to fill login form if present
const emailInput = page.locator('input[type="email"], input[name="email"]').first();
if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  await emailInput.fill(email);
  // Try password
  const passwordInput = page.locator('input[type="password"]').first();
  if (await passwordInput.isVisible({ timeout: 1000 }).catch(() => false)) {
    const pass = env.match(/NEXT_PUBLIC_ADMIN_PASS=(.+)/)?.[1]?.trim() || 'Concrem@2026';
    await passwordInput.fill(pass);
  }
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
}

await page.screenshot({ path: '_ss_after_login.png' });

// Click on "Produção" menu (try TopNav or AppSidebar)
const producao = page.getByText('Produção', { exact: false }).first();
if (await producao.isVisible({ timeout: 3000 }).catch(() => false)) {
  await producao.click();
  await page.waitForTimeout(800);
}

// Click "Uso e Consumo"
const consumo = page.getByText('Uso e Consumo', { exact: false }).first();
if (await consumo.isVisible({ timeout: 3000 }).catch(() => false)) {
  await consumo.click();
  await page.waitForTimeout(1500);
}

await page.screenshot({ path: '_ss_saldo.png', fullPage: false });

// Click "Movimentações" tab
const movsTab = page.getByText('Movimentações', { exact: false }).first();
if (await movsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
  await movsTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: '_ss_movimentacoes.png', fullPage: false });
}

await browser.close();
console.log('Screenshots saved.');
