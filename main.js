import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged }
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  getFirestore, collection, addDoc, doc,
  setDoc, getDoc, getDocs, updateDoc
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
let activeType = "diary";
let editorReturnView = "dayView";
let viewerReturnView = "dayView";
const monthCache = {};

function getRecordType(data) {
  // typeがない既存データは日記として扱う
  return data.type || "diary";
}

function isDiaryRecord(data) {
  return getRecordType(data) === "diary";
}

function collectionViewId(type) {
  return type === "schedule" ? "scheduleView" : "memoView";
}

function typeTitle(type) {
  return type === "schedule" ? "予定" : type === "memo" ? "メモ" : "日記";
}

function editorTitle(type) {
  return type === "schedule" ? "予定を書く" : type === "memo" ? "メモを書く" : "日記を書く";
}

function clearEditor() {
  title.value = "";
  content.value = "";
  comment.value = "";
  editingId = null;
}

// =============================
// ログイン
// =============================
window.login = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
};

onAuthStateChanged(auth, async user => {
  if (!user) return;

  loginArea.style.display = "none";

  const userDoc = await getDoc(doc(db, "users", user.uid));

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

  await setDoc(doc(db, "users", user.uid), {
    nickname: nicknameInput.value
  });

  nickname = nicknameInput.value;

  nicknameArea.style.display = "none";
  app.style.display = "block";

  renderCalendar();
};

// =============================
// カレンダー
// =============================
async function renderCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const y = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const key = `${y}-${String(m + 1).padStart(2, "0")}`;

  monthLabel.textContent = `${y}年 ${m + 1}月`;

  let snap;
  if (monthCache[key]) {
    snap = monthCache[key];
  } else {
    const { start, end } = getMonthRange(y, m);
    snap = await fetchDiariesByMonth(db, start, end);
    monthCache[key] = snap;
  }

  const map = {};

  snap.forEach(d => {
    const data = d.data();
    if (data.isDeleted || !isDiaryRecord(data)) return;

    const dateKey = toDateKey(data.createdAt);
    if (!dateKey) return;

    if (!map[dateKey]) map[dateKey] = {};

    const initial = (data.nickname || "").charAt(0);
    if (!map[dateKey][initial]) {
      map[dateKey][initial] = { hasPost: false, hasComment: false };
    }

    map[dateKey][initial].hasPost = true;
    if (data.comment) map[dateKey][initial].hasComment = true;
  });

  const first = new Date(y, m, 1).getDay();
  const last = new Date(y, m + 1, 0).getDate();

  // 曜日見出し（日〜土）をカレンダーの先頭行に表示
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  weekdays.forEach((weekday, index) => {
    const heading = document.createElement("div");
    heading.className = "weekday";
    if (index === 0 || index === 6) heading.classList.add("weekend");
    heading.textContent = weekday;
    calendar.appendChild(heading);
  });

  for (let i = 0; i < first; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= last; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.className = "day";
    const dayOfWeek = new Date(y, m, d).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) cell.classList.add("weekend");
    cell.onclick = () => openDay(ds);

    if (map[ds]) cell.classList.add("has-post");

    const dayNumber = document.createElement("div");
    dayNumber.className = "day-number";
    dayNumber.textContent = d;
    cell.appendChild(dayNumber);

    const info = map[ds];
    if (info) {
      Object.keys(info).forEach(initial => {
        const span = document.createElement("span");
        span.textContent = initial;
        span.className = "initial";

        if (initial === "た") {
          span.classList.add("left");
        } else if (initial === "ひ") {
          span.classList.add("right");
        }

        if (info[initial].hasComment) span.style.textDecoration = "underline";
        cell.appendChild(span);
      });
    }

    calendar.appendChild(cell);
  }
}

window.prevMonth = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};

window.nextMonth = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};

// =============================
// 日別画面（日記のみ）
// =============================
window.openDay = async (dateStr) => {
  selectedDateStr = dateStr;
  activeType = "diary";
  showView("dayView");

  selectedDate.textContent = dateStr;
  dailyList.innerHTML = "";

  const { start, end } = getDayRange(dateStr);
  const snap = await fetchDiariesByDay(db, start, end);

  snap.forEach(d => {
    const data = d.data();
    if (data.isDeleted || !isDiaryRecord(data)) return;

    const div = document.createElement("div");
    div.className = "diary-card";
    div.innerHTML = diaryItemTemplate(d, data, formatTime);
    dailyList.appendChild(div);
  });
};

// =============================
// 予定・メモ一覧
// =============================
window.openCollection = async (type) => {
  if (type !== "schedule" && type !== "memo") return;
  activeType = type;
  await renderCollection(type);
};

async function renderCollection(type) {
  activeType = type;
  const viewId = collectionViewId(type);
  const listId = type === "schedule" ? "scheduleList" : "memoList";
  const list = document.getElementById(listId);
  list.innerHTML = "";

  showView(viewId);

  const snap = await getDocs(collection(db, "diaries"));
  const records = [];

  snap.forEach(d => {
    const data = d.data();
    if (data.isDeleted || getRecordType(data) !== type) return;
    records.push({ doc: d, data });
  });

  records.sort((a, b) => {
    const aTime = toDate(a.data.createdAt)?.getTime?.() ?? 0;
    const bTime = toDate(b.data.createdAt)?.getTime?.() ?? 0;
    return bTime - aTime;
  });

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = `${typeTitle(type)}はまだありません。`;
    list.appendChild(empty);
    return;
  }

  records.forEach(({ doc: d, data }) => {
    const item = document.createElement("div");
    item.className = "diary-card";

    const date = document.createElement("div");
    date.className = "nickname";
    date.textContent = formatTime(data.createdAt);

    const heading = document.createElement("h4");
    heading.textContent = data.title || "(無題)";

    const actions = document.createElement("div");
    actions.className = "actions";

    const buttons = [
      ["閲覧", () => window.viewDiary(d.id)],
      ["編集", () => window.editDiary(d.id)],
      ["コメント", () => window.commentDiary(d.id)],
      ["削除", () => window.deleteDiary(d.id)]
    ];

    buttons.forEach(([label, action]) => {
      const button = document.createElement("button");
      button.textContent = label;
      button.onclick = action;
      actions.appendChild(button);
    });

    item.append(date, heading, actions);
    list.appendChild(item);
  });
}

window.openCollectionEditor = (type) => {
  if (type !== "schedule" && type !== "memo") return;
  activeType = type;
  editorReturnView = collectionViewId(type);
  clearEditor();
  document.getElementById("editorTitle").textContent = editorTitle(type);
  showView("editorView");
};

window.backToCollection = () => {
  if (activeType === "schedule" || activeType === "memo") {
    renderCollection(activeType);
  } else {
    showView("calendarView");
  }
};

window.goBackFromEditor = () => {
  showView(editorReturnView);
};

window.goBackFromViewer = () => {
  showView(viewerReturnView);
};

// =============================
// コメント編集
// =============================
window.commentDiary = async (id) => {
  editingId = id;

  const snap = await getDoc(doc(db, "diaries", id));
  if (snap.exists()) {
    const data = snap.data();
    activeType = getRecordType(data);
    title.value = data.title || "";
    content.value = data.content || "";
    comment.value = data.comment || "";
    editorReturnView = activeType === "diary" ? "dayView" : collectionViewId(activeType);
    document.getElementById("editorTitle").textContent = editorTitle(activeType);
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
  activeType = getRecordType(data);
  viewerReturnView = activeType === "diary" ? "dayView" : collectionViewId(activeType);

  document.getElementById("viewTitle").textContent = data.title || "(無題)";
  document.getElementById("viewMeta").textContent =
    (data.nickname || "") + " " + formatTime(data.createdAt);

  document.getElementById("viewContent").innerHTML = "読み込み中...";
  showView("viewDiaryView");

  document.getElementById("viewContent").innerHTML =
    await linkifyWithTitle(data.content || "");
  document.getElementById("viewComment").textContent = data.comment || "";
};

// =============================
// 編集
// =============================
window.editDiary = async (id) => {
  editingId = id;

  const snap = await getDoc(doc(db, "diaries", id));
  if (snap.exists()) {
    const data = snap.data();
    activeType = getRecordType(data);
    title.value = data.title || "";
    content.value = data.content || "";
    comment.value = data.comment || "";
    editorReturnView = activeType === "diary" ? "dayView" : collectionViewId(activeType);
    document.getElementById("editorTitle").textContent = editorTitle(activeType);
  }

  showView("editorView");
};

// =============================
// 保存
// =============================
window.saveDiary = async () => {
  if (editingId) {
    const snap = await getDoc(doc(db, "diaries", editingId));
    if (!snap.exists()) return;

    await updateDoc(doc(db, "diaries", editingId), {
      title: title.value,
      content: content.value,
      comment: comment.value || "",
      commentUpdatedAt: new Date()
    });

    editingId = null;
  } else {
    const record = {
      userId: auth.currentUser.uid,
      nickname: nickname,
      type: activeType,
      title: title.value,
      content: content.value,
      comment: comment.value || "",
      commentUpdatedAt: new Date(),
      isDeleted: false
    };

    if (activeType === "diary") {
      const { start } = getDayRange(selectedDateStr);
      record.createdAt = start;
    } else {
      record.createdAt = new Date();
    }

    await addDoc(collection(db, "diaries"), record);
  }

  if (activeType === "diary") {
    showView("dayView");
    await openDay(selectedDateStr);
  } else {
    await renderCollection(activeType);
  }
};

// =============================
// 削除
// =============================
window.deleteDiary = async (id) => {
  if (!confirm("削除しますか？")) return;

  await updateDoc(doc(db, "diaries", id), {
    isDeleted: true
  });

  if (activeType === "diary") {
    await openDay(selectedDateStr);
  } else {
    await renderCollection(activeType);
  }
};

// =============================
// 画面切替
// =============================
window.showView = (id) => {
  [
    "calendarView", "dayView", "editorView", "viewDiaryView",
    "scheduleView", "memoView"
  ].forEach(viewId => {
    document.getElementById(viewId).style.display = "none";
  });

  document.getElementById(id).style.display = "block";
};

// =============================
// 日記の新規投稿画面
// =============================
window.openEditor = () => {
  activeType = "diary";
  editorReturnView = "dayView";
  clearEditor();
  document.getElementById("editorTitle").textContent = editorTitle("diary");
  showView("editorView");
};
