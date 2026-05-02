import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, doc,
  setDoc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { firebaseConfig } from "./firebaseConfig.js";
import { githubConfig } from "./githubConfig.js";

import {
  toDate, toDateKey, formatTime,
  getDayRange, getMonthRange
} from "./utils.js";

import { setDeployInfo } from "./github.js";
import { diaryItemTemplate } from "./template.js";

import {
  fetchDiariesByMonth,
  fetchDiariesByDay
} from "./firestore.js";

import { linkify } from "./utils.js";
import { linkifyWithTitle } from "./utils.js";

initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();

document.addEventListener("DOMContentLoaded", () => {
  setDeployInfo(githubConfig.owner, githubConfig.repo);
});

// =============================
let selectedDateStr = "";
let nickname = "";
let editingId = null;
let currentDate = new Date();
const monthCache = {};
// =============================

// =============================
// ログイン
// =============================
window.login = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
};

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

  const key = `${y}-${String(m+1).padStart(2,"0")}`;

  monthLabel.textContent = `${y}年 ${m+1}月`;

  let snap;

  if (monthCache[key]) {
    snap = monthCache[key];
  } else {
    const { start, end } = getMonthRange(y, m);
    snap = await fetchDiariesByMonth(db, start, end);
    monthCache[key] = snap;
  }

  const map = {};
  
  snap.forEach(d=>{
  const data = d.data();
  console.log(data.nickname);
  if (data.isDeleted) return;

  const dateKey = toDateKey(data.createdAt);
  if (!dateKey) return;

  if (!map[dateKey]) {
    map[dateKey] = {};
  }

  const nick = data.nickname || "";
  const initial = nick.charAt(0);

  if (!map[dateKey][initial]) {
    map[dateKey][initial] = {
      hasPost: false,
      hasComment: false
    };
  }

  map[dateKey][initial].hasPost = true;

  if (data.comment) {
    map[dateKey][initial].hasComment = true;
  }
});
console.log(map);
  const first = new Date(y,m,1).getDay();
  const last = new Date(y,m+1,0).getDate();

  for(let i=0;i<first;i++){
    calendar.appendChild(document.createElement("div"));
  }

  for(let d=1; d<=last; d++){
    const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

    const cell = document.createElement("div");
    cell.className = "day";
    cell.onclick = ()=>openDay(ds);

if (map[ds]) {
  cell.classList.add("has-post");
}

const dayNumber = document.createElement("div");
dayNumber.textContent = d;

cell.appendChild(dayNumber);

const info = map[ds];

if (info) {
  Object.keys(info).forEach((initial) => {

    const span = document.createElement("span");
    span.textContent = initial;
    span.className = "initial";

    // 左右固定
    if (initial === "た") {
      span.classList.add("left");
    } else if (initial === "ひ") {
      span.classList.add("right");
    }

    if (info[initial].hasComment) {
      span.style.textDecoration = "underline";
    }

    cell.appendChild(span);
  });
}
calendar.appendChild(cell);
}

// 🔥 必須（ボタン動作）
window.prevMonth = () => {
  currentDate.setMonth(currentDate.getMonth()-1);
  renderCalendar();
};

window.nextMonth = () => {
  currentDate.setMonth(currentDate.getMonth()+1);
  renderCalendar();
};

// =============================
// 日表示
// =============================
window.openDay = async (dateStr)=>{
  selectedDateStr = dateStr;

  showView("dayView");

  selectedDate.textContent = dateStr;
  dailyList.innerHTML = "";

  const { start, end } = getDayRange(dateStr);

  const snap = await fetchDiariesByDay(db, start, end);

  snap.forEach(d=>{
    const data = d.data();
    if (data.isDeleted) return;

    const div = document.createElement("div");
    div.className = "diary-card";

    div.innerHTML = diaryItemTemplate(d, data, formatTime);

    dailyList.appendChild(div);
  });
};

// =============================
// コメント編集（追加）
// =============================
window.commentDiary = async (id)=>{
  editingId = id;

  const snap = await getDoc(doc(db,"diaries",id));
  if (snap.exists()){
    const data = snap.data();

    title.value = data.title || "";
    content.value = data.content || "";
    comment.value = data.comment || "";
  }

  showView("editorView");
};

// =============================
// 閲覧
// =============================
window.viewDiary = async (id) => {
  const snap = await getDoc(doc(db, "diaries", id));
  if (!snap.exists()) return;

  const data = snap.data();

  document.getElementById("viewTitle").textContent =
    data.title || "(無題)";

  document.getElementById("viewMeta").textContent =
    (data.nickname || "") + " " + formatTime(data.createdAt);

  // 🔥 先に表示
  document.getElementById("viewContent").innerHTML = "読み込み中...";

  showView("viewDiaryView");

  // 🔥 後から置き換え
  document.getElementById("viewContent").innerHTML =
    await linkifyWithTitle(data.content || "");

  document.getElementById("viewComment").textContent =
    data.comment || "";

  showView("viewDiaryView");
};

// =============================
// 編集
// =============================
window.editDiary = async (id)=>{
  editingId = id;

  const snap = await getDoc(doc(db,"diaries",id));
  if (snap.exists()){
    const data = snap.data();
    title.value = data.title;
    content.value = data.content;
    comment.value = data.comment || "";
  }

  showView("editorView");
};

// =============================
// 保存（コメント対応）
// =============================
window.saveDiary = async ()=>{
  const date = new Date();

  if(editingId){

    // 🔥 既存データ取得
    const snap = await getDoc(doc(db,"diaries",editingId));
    if (!snap.exists()) return;

    const old = snap.data();

    // 🔥 必要なものだけ更新
    await updateDoc(doc(db,"diaries",editingId),{
      title: title.value,
      content: content.value,
      comment: comment.value || "",
      commentUpdatedAt: new Date()
    });

    editingId = null;

  } else {

    // 新規作成はそのまま
    await addDoc(collection(db,"diaries"),{
      userId: auth.currentUser.uid,
      nickname: nickname,
      title: title.value,
      content: content.value,
      comment: comment.value || "",
      commentUpdatedAt: new Date(),
      createdAt: date,
      isDeleted: false
    });
  }

  showView("dayView");
  openDay(selectedDateStr);
};

// =============================
// 削除
// =============================
window.deleteDiary = async (id)=>{
  if(!confirm("削除しますか？")) return;

  await updateDoc(doc(db,"diaries",id),{
    isDeleted: true
  });

  openDay(selectedDateStr);
};

// =============================
// 画面切替
// =============================
window.showView = (id)=>{
  ["calendarView","dayView","editorView","viewDiaryView"].forEach(v=>{
    document.getElementById(v).style.display="none";
  });
  document.getElementById(id).style.display="block";
};

// =============================
// 投稿画面
// =============================
window.openEditor = ()=>{
  title.value="";
  content.value="";
  comment.value="";
  editingId=null;
  showView("editorView");
};

const info = map[ds];
}
