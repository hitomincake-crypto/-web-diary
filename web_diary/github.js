export async function setDeployInfo(owner, repo) {
  const el = document.getElementById("deployInfo");
  if (!el) return;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits`);
    const data = await res.json();

    if (!data || !data[0]) {
      el.textContent = "最終更新: 取得失敗";
      return;
    }

    const d = new Date(data[0].commit.committer.date);

    const formatted =
      d.getFullYear() + "-" +
      String(d.getMonth()+1).padStart(2,"0") + "-" +
      String(d.getDate()).padStart(2,"0") + " " +
      String(d.getHours()).padStart(2,"0") + ":" +
      String(d.getMinutes()).padStart(2,"0") + ":" +
      String(d.getSeconds()).padStart(2,"0");

    el.textContent = "最終更新: " + formatted;

  } catch (e) {
    el.textContent = "最終更新: 取得エラー";
    console.error(e);
  }
}