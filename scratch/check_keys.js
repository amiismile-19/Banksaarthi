const fs = require('fs');
const src = fs.readFileSync('Frontend/src/App.tsx', 'utf8');

const match = src.match(/const T: Record<Language, Record<string, string>> = (\{[\s\S]*?\n\});/);
const T = eval('(' + match[1] + ')');
const enKeys = new Set(Object.keys(T.en));

const accMatch = src.match(/const ACCOUNT_REVIEW_ORDER = (\[[\s\S]*?\]);/);
const kycMatch = src.match(/const KYC_REVIEW_ORDER = (\[[\s\S]*?\]);/);
const depMatch = src.match(/const DEPOSIT_REVIEW_ORDER = (\[[\s\S]*?\]);/);

const accOrders = eval(accMatch[1]);
const kycOrders = eval(kycMatch[1]);
const depOrders = eval(depMatch[1]);

console.log('Account orders missing from T:', accOrders.filter(k => !enKeys.has(k)));
console.log('KYC orders missing from T:', kycOrders.filter(k => !enKeys.has(k)));
console.log('Deposit orders missing from T:', depOrders.filter(k => !enKeys.has(k)));

const qKeys = Array.from(src.matchAll(/key:\s*"([^"]+)"/g)).map(m => m[1]);
const uniqueQKeys = [...new Set(qKeys)];
console.log('Question keys missing from T:', uniqueQKeys.filter(k => !enKeys.has(k)));
