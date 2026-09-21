/**
 * Drift-free duration math. Every tick must recompute from Date.now()
 * (or an injected nowMs) rather than decrementing a stored counter.
 */
(function (root) {
  const MS = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function splitDuration(ms) {
    const safe = Math.max(0, Math.floor(ms));
    const days = Math.floor(safe / MS.day);
    const hours = Math.floor((safe % MS.day) / MS.hour);
    const minutes = Math.floor((safe % MS.hour) / MS.minute);
    const seconds = Math.floor((safe % MS.minute) / MS.second);
    return { days, hours, minutes, seconds, totalMs: safe };
  }

  function measure(targetMs, nowMs) {
    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const delta = now - targetMs;
    const finished = delta >= 0;
    const parts = splitDuration(Math.abs(delta));
    return {
      finished,
      remainingMs: finished ? 0 : -delta,
      elapsedMs: finished ? delta : 0,
      days: parts.days,
      hours: parts.hours,
      minutes: parts.minutes,
      seconds: parts.seconds,
    };
  }

  function formatParts(parts) {
    return {
      days: String(parts.days),
      hours: pad2(parts.hours),
      minutes: pad2(parts.minutes),
      seconds: pad2(parts.seconds),
    };
  }

  root.HKDSECountdown = {
    MS,
    pad2,
    splitDuration,
    measure,
    formatParts,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = root.HKDSECountdown;
  }
})(typeof window !== "undefined" ? window : globalThis);
