import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// =============================
// 月単位取得
// =============================
export async function fetchDiariesByMonth(db, start, end) {
  const q = query(
    collection(db, "diaries"),
    where("createdAt", ">=", start),
    where("createdAt", "<", end)
  );

  return await getDocs(q);
}

// =============================
// 日単位取得
// =============================
export async function fetchDiariesByDay(db, start, end) {
  const q = query(
    collection(db, "diaries"),
    where("createdAt", ">=", start),
    where("createdAt", "<=", end)
  );

  return await getDocs(q);
}