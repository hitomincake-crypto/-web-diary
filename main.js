import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, doc,
  setDoc, getDoc, getDocs, updateDoc,
  query, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";

initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

let selectedDateStr = "";
let nickname = "";
let editingId = null;
let currentDate = new Date();


// =============================
// 日付変換
// =============================
function toDate(createdAt) {
  if (!createdAt) return null;
  if (createdAt.seconds) return new Date(createdAt.seconds * 1000);

  const d = new Date(createdAt);
  if (isNaN(d)) return null;

  return d;
}

// =============================
// 日付キー
// =============================
function toDateKey(createdAt) {
  const d = toDate(createdAt);
  if (!d) return null;

  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// =============================
// 時刻フォーマット
// =============================
function formatTime(createdAt) {
  const d = toDate(createdAt);
  if (!d) return "";

  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}


// ログイン
window.login = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
};


// ログイン後
onAuthStateChanged(auth, async user => {
  if (!user) return;

  loginArea.style.display = "none";

  const userDoc = await getDoc(doc(db,"users",user.uid));

  if (!userDoc.exists()) {
    nicknameArea.style.display = "block";
  } else {
    nickname = userDoc.data().nickname;
    app.style.display = "block";
    renderCalendar();
  }
});


// ニックネーム
window.saveNickname = async () => {
  const user = auth.currentUser;

  await setDoc(doc(db,"users",user.uid),{
    nickname: nicknameInput.value
  });

  nickname = nicknameInput.value;

  nicknameArea.style.display="none";
  app.style.display="block";

  renderCalendar();
};


// =============================
// カレンダー
// =============================
async function renderCalendar(){
  const calendar = document.getElementById("calendar");
  calendar.innerHTML="";

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();

  monthLabel.textContent = `${y}年 ${m+1}月`;

  // 🔥 月範囲取得
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 1);

  const q = query(
    collection(db,"diaries"),
    where("createdAt", ">=", start),
    where("createdAt", "<", end)
  );

  const snap = await getDocs(q);
  const map = {};

  snap.forEach(d=>{
    const data = d.data();
    if (data.isDeleted) return;

    const key = toDateKey(data.createdAt);
    if (!key) return;

    map[key] = true;
  });

  const first = new Date(y,m,1).getDay();
  const last = new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++){
    calendar.appendChild(document.createElement("div"));
  }

  for(let d=1; d<=last; d++){
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    const cell = document.createElement("div");
    cell.className = "day";

    if (map[ds]) cell.classList.add("has-post");

    const todayKey = toDateKey(new Date());
    if (ds === todayKey) {
      cell.style.border = "2px solid black";
    }

    cell.textContent = d;
    cell.onclick = ()=>openDay(ds);

    calendar.appendChild(cell);
  }
}


// 月切替
window.prevMonth = () => {
  currentDate.setMonth(currentDate.getMonth()-1);
  renderCalendar();
};

window.nextMonth = () => {
  currentDate.setMonth(currentDate.getMonth()+1);
  renderCalendar();
};


// =============================
// 日表示（※ここは仕様維持で全件のまま）
// =============================
window.openDay = async (dateStr)=>{
  selectedDateStr = dateStr;

  showView("dayView");

  selectedDate.textContent = dateStr;
  dailyList.innerHTML = "";

  const snap = await getDocs(collection(db,"diaries"));

  snap.forEach(d=>{
    const data = d.data();
    if (data.isDeleted) return;

    const key = toDateKey(data.createdAt);
    if (!key) return;

    if (key === dateStr){
      const div = document.createElement("div");
      div.className = "diary-card";

      const nick = data.nickname || "";
      const time = formatTime(data.createdAt);
      const titleText = data.title || "(無題)";
      const contentText = data.content || "";

      div.innerHTML = `
        <div class="nickname">${nick}　${time}</div>
        <h4>${titleText}</h4>
        <p>${contentText}</p>
        <div class="actions">
          <button onclick="editDiary('${d.id}')">✏️</button>
          <button onclick="deleteDiary('${d.id}')">🗑️</button>
        </div>
      `;

      dailyList.appendChild(div);
    }
  });
};


// 編集（そのまま）
window.editDiary = async (id)=>{
  editingId = id;

  const snap = await getDocs(collection(db,"diaries"));
  snap.forEach(d=>{
    if(d.id === id){
      const data = d.data();
      title.value = data.title;
      content.value = data.content;
    }
  });

  showView("editorView");
};


// 保存
window.saveDiary = async ()=>{
  const date = new Date(selectedDateStr + "T12:00:00");

  const data = {
    userId: auth.currentUser.uid,
    nickname: nickname,
    title: title.value,
    content: content.value,
    createdAt: date,
    isDeleted: false
  };

  if(editingId){
    await updateDoc(doc(db,"diaries",editingId), data);
    editingId = null;
  } else {
    await addDoc(collection(db,"diaries"), data);
  }

  showView("dayView");
  openDay(selectedDateStr);
};


// 削除
window.deleteDiary = async (id)=>{
  if(!confirm("削除しますか？")) return;

  await updateDoc(doc(db,"diaries",id),{
    isDeleted: true
  });

  openDay(selectedDateStr);
};


// 画面切替
window.showView = (id)=>{
  ["calendarView","dayView","editorView"].forEach(v=>{
    document.getElementById(v).style.display="none";
  });
  document.getElementById(id).style.display="block";
};


// 投稿画面
window.openEditor = ()=>{
  title.value="";
  content.value="";
  editingId=null;
  showView("editorView");
};