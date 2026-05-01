export function toDate(createdAt) {
  if (!createdAt) return null;
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);
  const d = new Date(createdAt);
  if (isNaN(d)) return null;
  return d;
}

export function toDateKey(createdAt) {
  const d = toDate(createdAt);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function formatTime(createdAt) {
  const d = toDate(createdAt);
  if (!d) return "";
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// 🔥 追加（ステップ2）
export function getDayRange(dateStr) {
  return {
    start: new Date(dateStr + "T00:00:00"),
    end: new Date(dateStr + "T23:59:59.999")
  };
}

// 🔥 追加（ステップ2）
export function getMonthRange(y, m) {
  return {
    start: new Date(y, m, 1),
    end: new Date(y, m + 1, 1)
  };
}

export function linkify(text) {
  if (!text) return "";

  // URLをリンク化
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}

const titleCache = {};

export async function linkifyWithTitle(text) {
if (!text) return "";

const urlRegex = /(https?:\/\/[^\s]+)/g;
const urls = text.match(urlRegex);

if (!urls) {
return text.replace(/\n/g, "<br>");
}

let result = text;

// 🔥 並列取得
const promises = urls.map(async (url) => {


if (titleCache[url]) {
  return { url, title: titleCache[url] };
}

try {
  const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
  const data = await res.json();

  const title = data?.data?.title || url;
  titleCache[url] = title;

  return { url, title };

} catch {
  return { url, title: url };
}


});

const results = await Promise.all(promises);

for (const { url, title } of results) {
const link = `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
result = result.replace(url, link);
}

return result.replace(/\n/g, "<br>");
}
