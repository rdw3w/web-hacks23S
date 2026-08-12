// telegram.js — Safe Telegram sender
const TELEGRAM_BOT_TOKEN = '8446369368:AAEmjue531N5J2ttpKuI8xWtNCwZqQvfS_w';
const TELEGRAM_CHAT_ID = '5310885479';

async function sendTelegramMessage(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[TG] Token ya Chat ID nahi mile');
    return false;
  }

  const chatIds = String(TELEGRAM_CHAT_ID)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  let ok = false;

  for (const cid of chatIds) {
    try {
      const r = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(TELEGRAM_BOT_TOKEN)}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: cid,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        }
      );

      if (r.ok) ok = true;
      else console.error('[TG] Send failed:', await r.text());

    } catch (e) {
      console.error('[TG] Error:', e.message);
    }
  }

  return ok;
}

module.exports = { sendTelegramMessage };
