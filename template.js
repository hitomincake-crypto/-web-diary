export function diaryItemTemplate(d, data, formatTime) {
  const nick = data.nickname || "";
  const time = formatTime(data.createdAt);
  const titleText = data.title || "(無題)";

  return `
    <div class="nickname">${nick}　${time}</div>
    <h4>${titleText}</h4>
    <div class="actions">
      <button onclick="viewDiary('${d.id}')">閲覧</button>
      <button onclick="editDiary('${d.id}')">編集</button>
      <button onclick="commentDiary('${d.id}')">コメント</button>
      <button onclick="deleteDiary('${d.id}')">削除</button>
    </div>
  `;
}