# 2017 HKDSE 各科倒數 / Examination Countdown

公開靜態網頁，按 **2017 年香港中學文憑考試時間表（附件一）** 為每一科、每一場顯示準確至秒的倒數。所有 2017 年試期相對今日已過去，頁面會清楚標示 **已完結 / Finished**，並繼續以秒顯示開考後經過的時間。日期不會改寫成 2027 或其他年份。

A public static page with per-subject, second-level timers for the **2017 HKDSE Examination Timetable (Annex 1)**. Because those 2017 dates are in the past, every session shows a **Finished** state plus live elapsed time. Dates stay in 2017.

## 公開網址 / Public URL

- 網站 / Site: https://ccleungsir.github.io/hkdse-2017-countdown/
- 原始碼 / Repository: https://github.com/ccleungsir/hkdse-2017-countdown

## 資料來源 / Source

官方附件一《2017 年香港中學文憑考試時間表 / Examination Timetable for 2017 HKDSE》。科目與日期以該表為準。

Official Annex 1 is the source of truth for subjects and dates.

## 時間假設 / Time assumptions

附件一只標示上午／下午，沒有鐘面時間。本站採用慣例並在頁面註明：

Annex 1 marks AM/PM only. Conventional HKDSE written-paper start times are used and stated on the page:

- 上午場 AM sessions: `08:30:00` 香港時間 / HKT (`Asia/Hong_Kong`)
- 下午場 PM sessions: `13:30:00` 香港時間 / HKT
- 中國語文卷三（2017-04-06）與英國語文卷三（2017-04-08）按附件一上午場，預設 `08:30:00`
- 所有目標時刻編碼為帶 `+08:00` 的 ISO 8601 絕對時間
- 2017-05-04 以中文星期「星期四」為準（當天確為星期四；附件一英文 Wed 為誤植）
- 設計與應用科技、音樂、體育按註 2 保留 4 月 13 日與 4 月 28 日兩個檔期
- 5 月 5 至 6 日列為後備日

倒數每秒以 `Date.now()` 重新計算，不用遞減計數器，避免時間漂移。

## 本機預覽 / Local preview

無需建置步驟：

```bash
python3 -m http.server 8080
```

然後開啟 http://127.0.0.1:8080/

檢查時間表資料：

```bash
python3 tests/verify.py
```

## GitHub Pages

`main` 已包含靜態站與 `.github/workflows/pages.yml`（GitHub Actions 部署）。

此雲端代理的 token **沒有**建立 Pages 站台的管理員權限（`has_pages: false`，API 回 403）。請用擁有者帳號做一次設定：

1. 打開 [Pages 設定](https://github.com/ccleungsir/hkdse-2017-countdown/settings/pages)
2. Build and deployment → Source 選 **GitHub Actions**
3. 到 [Actions](https://github.com/ccleungsir/hkdse-2017-countdown/actions/workflows/pages.yml) 重跑 **Deploy GitHub Pages**，或再 push `main`

完成後公開網址為 https://ccleungsir.github.io/hkdse-2017-countdown/

The workflow is ready on `main`. Enabling Pages the first time requires repo admin (Settings → Pages → Source: GitHub Actions), then re-run the deploy workflow.
