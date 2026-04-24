import { diaryItemTemplatePC } from "./template-pc.js";
import { diaryItemTemplateMobile } from "./template-mobile.js";

// 画面サイズ判定
function isMobile() {
  return window.innerWidth <= 1024;
}

// 🔥 既存関数をそのまま使う（これが重要）
export function diaryItemTemplate(d, data, formatTime) {
  if (isMobile()) {
    return diaryItemTemplateMobile(d, data, formatTime);
  }
  return diaryItemTemplatePC(d, data, formatTime);
}