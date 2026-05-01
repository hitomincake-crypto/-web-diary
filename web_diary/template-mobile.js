export function diaryItemTemplateMobile(d, data, formatTime) {
const nick = data.nickname || "";
const time = formatTime(data.createdAt);
const titleText = data.title || "(無題)";

return `     <div class="nickname">${nick}<br>${time}</div>     <h4>${titleText}</h4>     <div class="actions">       <button onclick="viewDiary('${d.id}')">見る</button>       <button onclick="editDiary('${d.id}')">編集</button>       <button onclick="commentDiary('${d.id}')">コメ</button>       <button onclick="deleteDiary('${d.id}')">削除</button>     </div>
  `;
}
