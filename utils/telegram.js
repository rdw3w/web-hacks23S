// utils/telegram.js
// Safe Telegram helper. Reads token & chat id(s) from environment variables.
// Do NOT commit real tokens. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel env.

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || ''; // comma-separated

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegramMessage(htmlText) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
    return;
  }
  const chatIds = String(TELEGRAM_CHAT_ID).split(',').map(s => s.trim()).filter(Boolean);
  for (const chatId of chatIds) {
    try {
      await fetch(`https://api.telegram.org/bot${encodeURIComponent(TELEGRAM_BOT_TOKEN)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: htmlText, parse_mode: 'HTML', disable_web_page_preview: true })
      });
    } catch (err) {
      console.error('[telegram] send error', err);
    }
  }
}

module.exports = { sendTelegramMessage, escapeHtml };
