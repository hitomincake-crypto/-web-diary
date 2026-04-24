export function diaryItemTemplateMobile(d, data, formatTime) {
  const nick = data.nickname || "";
  const time = formatTime(data.createdAt);
  const titleText = data.title || "(無題)";

  return `
    <div class="diary-card mobile-card" onclick="viewDiary('${d.id}')">
      <div class="nickname">${nick}<br>${time}</div>
      <h4>${titleText}</h4>

      <div class="actions" onclick="event.stopPropagation()">
        <button onclick="viewDiary('${d.id}')">👁</button>
        <button onclick="editDiary('${d.id}')">✏️</button>
        <button onclick="commentDiary('${d.id}')">💬</button>
        <button onclick="deleteDiary('${d.id}')">🗑</button>
      </div>
    </div>
  `;
}