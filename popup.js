const defaultApiBase = "https://linkedin-automation-8tng.onrender.com/api";
const defaultDashboard = "https://linkedin-automation-frontend-phcy.onrender.com/";
const defaultPricing = "https://linkedin-automation-frontend-phcy.onrender.com/pricing.html";

const apiBaseInput = document.getElementById("apiBase");
const loginEmailInput = document.getElementById("loginEmail");
const loginPasswordInput = document.getElementById("loginPassword");
const deviceIdInput = document.getElementById("deviceId");
const actionTypeSelect = document.getElementById("actionType");

const saveBtn = document.getElementById("saveBtn");
const loginStartBtn = document.getElementById("loginStartBtn");
const refreshBtn = document.getElementById("refreshBtn");
const checkCreditsBtn = document.getElementById("checkCreditsBtn");
const consumeBtn = document.getElementById("consumeBtn");

const usageBox = document.getElementById("usageBox");
const feedMonitorNotice = document.getElementById("feedMonitorNotice");
const statusBox = document.getElementById("statusBox");
const dashboardLink = document.getElementById("dashboardLink");
const pricingLink = document.getElementById("pricingLink");

let cachedPolicy = null;

function generateDeviceId() {
  return `ext-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function selectedActionType() {
  return String(actionTypeSelect.value || "profile_search").trim().toLowerCase();
}

function updateFeedMonitorNotice() {
  const isFeedMonitor = selectedActionType() === "feed_monitor";
  feedMonitorNotice.style.display = isFeedMonitor ? "block" : "none";
}

function setStatus(text, kind = "info") {
  statusBox.textContent = text;
  if (kind === "error") {
    statusBox.style.background = "#fde9ea";
    statusBox.style.color = "#8d1f2c";
    return;
  }
  if (kind === "ok") {
    statusBox.style.background = "#e8f7ef";
    statusBox.style.color = "#1a6b40";
    return;
  }
  if (kind === "warn") {
    statusBox.style.background = "#fff7e6";
    statusBox.style.color = "#8a5b00";
    return;
  }
  statusBox.style.background = "#eaf2ff";
  statusBox.style.color = "#133f86";
}

function openPricingRedirect(url) {
  const target = String(url || "").trim() || defaultPricing;
  try {
    window.open(target, "_blank", "noopener,noreferrer");
  } catch {
    setStatus(`Upgrade here: ${target}`, "error");
  }
}

function setUsage(entitlements) {
  const extension = (entitlements || {}).extension || {};
  const policy = extension.policy || {};
  cachedPolicy = policy;

  const credits = Number(extension.credit_balance || 0);
  const fastMode = policy.fast_mode_enabled ? "ON" : "OFF";
  const used = Number(policy.profile_search_used_today || 0);
  const unlimited = Boolean(policy.profile_search_unlimited);
  const remainingRaw = Number(policy.profile_search_remaining_today || 0);
  const remainingText = unlimited ? "Unlimited" : String(Math.max(0, remainingRaw));

  usageBox.textContent = `Credits: ${credits} | Profile Search Used: ${used} | Remaining: ${remainingText} | Fast Mode: ${fastMode}`;
}

async function loadStored() {
  const data = await chrome.storage.local.get(["apiBase", "loginEmail", "loginPassword", "deviceId"]);
  apiBaseInput.value = data.apiBase || defaultApiBase;
  loginEmailInput.value = data.loginEmail || "";
  loginPasswordInput.value = data.loginPassword || "";
  const deviceId = data.deviceId || generateDeviceId();
  deviceIdInput.value = deviceId;
  await chrome.storage.local.set({ deviceId });
  dashboardLink.href = defaultDashboard;
  pricingLink.href = defaultPricing;
  updateFeedMonitorNotice();
}

async function saveSettings() {
  const apiBase = String(apiBaseInput.value || "").trim().replace(/\/$/, "");
  const loginEmail = String(loginEmailInput.value || "").trim();
  const loginPassword = String(loginPasswordInput.value || "");
  const deviceId = String(deviceIdInput.value || "").trim() || generateDeviceId();

  if (!apiBase) {
    setStatus("API base is required.", "error");
    return;
  }
  if (!loginEmail || !loginEmail.includes("@")) {
    setStatus("Valid dashboard email is required.", "error");
    return;
  }
  if (!loginPassword) {
    setStatus("Dashboard password is required.", "error");
    return;
  }

  await chrome.storage.local.set({ apiBase, loginEmail, loginPassword, deviceId });
  deviceIdInput.value = deviceId;
  setStatus("Saved settings.", "ok");
}

async function dashboardLogin(apiBase, loginEmail, loginPassword) {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: loginEmail, password: loginPassword }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  const token = String(json.data?.access_token || "");
  if (!token) {
    throw new Error("auth_token_missing");
  }
  return token;
}

async function startExtensionSession(apiBase, authToken, deviceId) {
  const res = await fetch(`${apiBase}/extension/session/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      device_id: deviceId,
      device_name: "Chrome Extension",
      platform: "chrome",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data || {};
}

async function loginAndStart() {
  const apiBase = String(apiBaseInput.value || "").trim().replace(/\/$/, "");
  const loginEmail = String(loginEmailInput.value || "").trim();
  const loginPassword = String(loginPasswordInput.value || "");
  const deviceId = String(deviceIdInput.value || "").trim();

  if (!apiBase || !loginEmail || !loginPassword || !deviceId) {
    setStatus("Save API base, email, password and device first.", "error");
    return;
  }

  setStatus("Logging in and starting extension session...");
  try {
    const authToken = await dashboardLogin(apiBase, loginEmail, loginPassword);
    const data = await startExtensionSession(apiBase, authToken, deviceId);
    const extensionToken = String(data.extension_token || "");

    await chrome.storage.local.set({ authToken, extensionToken, apiBase, loginEmail, loginPassword, deviceId });
    setUsage(data.entitlements || {});
    setStatus("Session ready.", "ok");
  } catch (err) {
    setStatus(`Login/session failed: ${String(err)}`, "error");
  }
}

async function refreshUsage() {
  const data = await chrome.storage.local.get(["apiBase", "authToken"]);
  const apiBase = String(data.apiBase || "").trim().replace(/\/$/, "");
  const authToken = String(data.authToken || "").trim();

  if (!apiBase || !authToken) {
    setStatus("Login first.", "error");
    return;
  }

  setStatus("Refreshing usage...");
  try {
    const res = await fetch(`${apiBase}/entitlements`, {
      method: "GET",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }
    setUsage(json.data || {});
    setStatus("Usage updated.", "ok");
  } catch (err) {
    setStatus(`Usage refresh failed: ${String(err)}`, "error");
  }
}

async function extensionActionCall(path, body) {
  const data = await chrome.storage.local.get(["apiBase", "extensionToken", "deviceId"]);
  const apiBase = String(data.apiBase || "").trim().replace(/\/$/, "");
  const extensionToken = String(data.extensionToken || "").trim();
  const deviceId = String(data.deviceId || "").trim();

  if (!apiBase || !extensionToken || !deviceId) {
    throw new Error("Start session first.");
  }

  const payload = {
    ...(body || {}),
    device_id: deviceId,
  };

  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Extension-Token": extensionToken,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }
  return json.data || {};
}

async function checkAction() {
  const actionType = selectedActionType();
  setStatus(`Checking ${actionType}...`);
  try {
    const row = await extensionActionCall("/extension/credits/check", { action_type: actionType });
    if (!row.allowed) {
      const msg = row.message || row.reason || "Denied";
      setStatus(`${actionType}: ${msg}`, row.reason === "use_webapp_for_feature" ? "warn" : "error");
      if (row.redirect_url) {
        openPricingRedirect(row.redirect_url);
      }
      return;
    }

    if (row.policy) {
      cachedPolicy = row.policy;
    }
    setStatus(`${actionType} allowed. Cost ${row.required_credits}, balance ${row.current_balance}.`, "ok");
  } catch (err) {
    setStatus(`Check failed: ${String(err)}`, "error");
  }
}

async function runAction() {
  const actionType = selectedActionType();
  setStatus(`Running ${actionType}...`);
  try {
    const requestId = `${actionType}-${Date.now()}`;
    const row = await extensionActionCall("/extension/credits/consume", {
      action_type: actionType,
      request_id: requestId,
    });

    if (!row.allowed) {
      const msg = row.message || row.reason || "Denied";
      setStatus(`${actionType}: ${msg}`, row.reason === "use_webapp_for_feature" ? "warn" : "error");
      if (row.redirect_url) {
        openPricingRedirect(row.redirect_url);
      }
      return;
    }

    if (row.policy) {
      cachedPolicy = row.policy;
    }
    const newBalance = Number(row.new_balance || 0);
    if (newBalance <= 0 && row.redirect_url) {
      openPricingRedirect(row.redirect_url);
    }
    setStatus(`${actionType} done. New balance ${newBalance}.`, "ok");
    await refreshUsage();
  } catch (err) {
    setStatus(`Run failed: ${String(err)}`, "error");
  }
}

saveBtn.addEventListener("click", saveSettings);
loginStartBtn.addEventListener("click", loginAndStart);
refreshBtn.addEventListener("click", refreshUsage);
checkCreditsBtn.addEventListener("click", checkAction);
consumeBtn.addEventListener("click", runAction);
actionTypeSelect.addEventListener("change", updateFeedMonitorNotice);

loadStored();
