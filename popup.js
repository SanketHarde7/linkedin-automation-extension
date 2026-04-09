const defaultApiBase = "https://linkedin-automation-8tng.onrender.com/api";
const defaultDashboard = "https://linkedin-automation-frontend-phcy.onrender.com/";
const defaultPricing = "https://linkedin-automation-frontend-phcy.onrender.com/pricing.html";

const apiBaseInput = document.getElementById("apiBase");
const authTokenInput = document.getElementById("authToken");
const saveBtn = document.getElementById("saveBtn");
const checkBtn = document.getElementById("checkBtn");
const startSessionBtn = document.getElementById("startSessionBtn");
const checkCreditsBtn = document.getElementById("checkCreditsBtn");
const consumeBtn = document.getElementById("consumeBtn");
const deviceIdInput = document.getElementById("deviceId");
const statusBox = document.getElementById("statusBox");
const dashboardLink = document.getElementById("dashboardLink");
const pricingLink = document.getElementById("pricingLink");

function generateDeviceId() {
  return `ext-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  statusBox.style.background = "#eaf2ff";
  statusBox.style.color = "#133f86";
}

function openPricingRedirect(url) {
  const target = String(url || "").trim() || defaultPricing;
  try {
    window.open(target, "_blank", "noopener,noreferrer");
  } catch {
    // If popup context blocks open, at least expose link in status.
    setStatus(`Upgrade here: ${target}`, "error");
  }
}

async function loadStored() {
  const data = await chrome.storage.local.get(["apiBase", "authToken", "deviceId"]);
  apiBaseInput.value = data.apiBase || defaultApiBase;
  authTokenInput.value = data.authToken || "";
  const deviceId = data.deviceId || generateDeviceId();
  deviceIdInput.value = deviceId;
  await chrome.storage.local.set({ deviceId });
  dashboardLink.href = defaultDashboard;
  pricingLink.href = defaultPricing;
}

async function saveSettings() {
  const apiBase = String(apiBaseInput.value || "").trim().replace(/\/$/, "");
  const authToken = String(authTokenInput.value || "").trim();
  const deviceId = String(deviceIdInput.value || "").trim() || generateDeviceId();

  if (!apiBase) {
    setStatus("API base is required.", "error");
    return;
  }

  await chrome.storage.local.set({ apiBase, authToken, deviceId });
  deviceIdInput.value = deviceId;
  setStatus("Saved settings.", "ok");
}

async function startExtensionSession() {
  const data = await chrome.storage.local.get(["apiBase", "authToken", "deviceId"]);
  const apiBase = String(data.apiBase || "").trim().replace(/\/$/, "");
  const authToken = String(data.authToken || "").trim();
  const deviceId = String(data.deviceId || "").trim();

  if (!apiBase || !authToken || !deviceId) {
    setStatus("Save API base, auth token and device first.", "error");
    return;
  }

  setStatus("Starting extension session...");

  try {
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
      const msg = json.error || `HTTP ${res.status}`;
      setStatus(`Session failed: ${msg}`, "error");
      return;
    }

    const extensionToken = String(json.data?.extension_token || "");
    const balance = Number(json.data?.entitlements?.extension?.credit_balance || 0);
    await chrome.storage.local.set({ extensionToken });
    setStatus(`Extension session started. Credits: ${balance}`, "ok");
  } catch (err) {
    setStatus(`Session error: ${String(err)}`, "error");
  }
}

async function checkCredits() {
  const data = await chrome.storage.local.get(["apiBase", "extensionToken", "deviceId"]);
  const apiBase = String(data.apiBase || "").trim().replace(/\/$/, "");
  const extensionToken = String(data.extensionToken || "").trim();
  const deviceId = String(data.deviceId || "").trim();

  if (!apiBase || !extensionToken || !deviceId) {
    setStatus("Start extension session first.", "error");
    return;
  }

  setStatus("Checking credit cost...");

  try {
    const res = await fetch(`${apiBase}/extension/credits/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Token": extensionToken,
      },
      body: JSON.stringify({
        action_type: "quick_comment_draft",
        device_id: deviceId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json.error || `HTTP ${res.status}`;
      setStatus(`Check error: ${msg}`, "error");
      return;
    }

    const row = json.data || {};
    if (!row.allowed) {
      setStatus(`Denied. Balance ${row.current_balance || 0}.`, "error");
      if (row.redirect_url) {
        openPricingRedirect(row.redirect_url);
      }
      return;
    }

    setStatus(`Allowed. Cost ${row.required_credits}, balance ${row.current_balance}.`, "ok");
  } catch (err) {
    setStatus(`Check error: ${String(err)}`, "error");
  }
}

async function consumeCredits() {
  const data = await chrome.storage.local.get(["apiBase", "extensionToken", "deviceId"]);
  const apiBase = String(data.apiBase || "").trim().replace(/\/$/, "");
  const extensionToken = String(data.extensionToken || "").trim();
  const deviceId = String(data.deviceId || "").trim();

  if (!apiBase || !extensionToken || !deviceId) {
    setStatus("Start extension session first.", "error");
    return;
  }

  setStatus("Consuming one draft credit...");

  try {
    const requestId = `${deviceId}-${Date.now()}`;
    const res = await fetch(`${apiBase}/extension/credits/consume`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Extension-Token": extensionToken,
      },
      body: JSON.stringify({
        action_type: "quick_comment_draft",
        request_id: requestId,
        device_id: deviceId,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json.error || `HTTP ${res.status}`;
      setStatus(`Consume error: ${msg}`, "error");
      return;
    }

    const row = json.data || {};
    if (!row.allowed) {
      setStatus(`No credits left. Balance ${row.current_balance || 0}.`, "error");
      if (row.redirect_url) {
        openPricingRedirect(row.redirect_url);
      }
      return;
    }

    setStatus(`Consumed. New balance ${row.new_balance}.`, "ok");
  } catch (err) {
    setStatus(`Consume error: ${String(err)}`, "error");
  }
}

async function checkLicense() {
  const data = await chrome.storage.local.get(["apiBase", "authToken"]);
  const apiBase = String(data.apiBase || "").trim().replace(/\/$/, "");
  const authToken = String(data.authToken || "").trim();

  if (!apiBase || !authToken) {
    setStatus("Save API base and bearer token first.", "error");
    return;
  }

  setStatus("Checking license...");

  try {
    const res = await fetch(`${apiBase}/license/status`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const msg = json.error || `HTTP ${res.status}`;
      setStatus(`Check failed: ${msg}`, "error");
      return;
    }

    const dataRow = json.data || {};
    const state = String(dataRow.status || "unknown");
    const expiry = dataRow.expires_at ? ` | exp: ${dataRow.expires_at}` : "";
    setStatus(`License: ${state}${expiry}`, "ok");
  } catch (err) {
    setStatus(`Network error: ${String(err)}`, "error");
  }
}

saveBtn.addEventListener("click", saveSettings);
checkBtn.addEventListener("click", checkLicense);
startSessionBtn.addEventListener("click", startExtensionSession);
checkCreditsBtn.addEventListener("click", checkCredits);
consumeBtn.addEventListener("click", consumeCredits);
loadStored();
