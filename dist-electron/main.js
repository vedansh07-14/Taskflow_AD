import e from "electron";
import t from "node:path";
import n from "node:fs";
import { fileURLToPath as r } from "node:url";
// electron/main.js
var { app: i, BrowserWindow: a, ipcMain: o } = e, s = r(import.meta.url), c = t.dirname(s), l = null;
function u() {
	let e = [
		t.join(c, "preload.mjs"),
		t.join(c, "preload.js"),
		t.join(c, "preload.cjs"),
		t.join(c, "../dist-electron/preload.mjs"),
		t.join(c, "../dist-electron/preload.js")
	];
	for (let t of e) if (n.existsSync(t)) return t;
	return t.join(c, "preload.mjs");
}
function d() {
	let e = u();
	console.log(`[Main Process] Using preload script: ${e}`), l = new a({
		width: 1e3,
		height: 700,
		minWidth: 800,
		minHeight: 550,
		title: "TaskFlow Pro (Dev Environment)",
		backgroundColor: "#0b0f19",
		show: !1,
		webPreferences: {
			preload: e,
			contextIsolation: !0,
			nodeIntegration: !1,
			sandbox: !0
		}
	}), l.once("ready-to-show", () => {
		l.show();
	});
	let n = process.env.VITE_DEV_SERVER_URL;
	if (n) console.log(`[Main Process] Loading from Vite dev server: ${n}`), l.loadURL(n).catch((e) => {
		console.error("[Main Process] Failed to load Vite dev server:", e);
	});
	else {
		let e = t.join(c, "../dist/index.html");
		console.log(`[Main Process] Loading production build from: ${e}`), l.loadFile(e).catch((e) => {
			console.error("[Main Process] Failed to load production index.html:", e);
		});
	}
	l.on("closed", () => {
		l = null;
	});
}
o.handle("app:ping", async () => ({
	status: "connected",
	message: "IPC channel between React renderer and Electron main process is active.",
	electronVersion: process.versions.electron,
	nodeVersion: process.versions.node,
	chromeVersion: process.versions.chrome,
	platform: process.platform
})), i.whenReady().then(() => {
	d(), i.on("activate", () => {
		a.getAllWindows().length === 0 && d();
	});
}).catch((e) => {
	console.error("[Main Process] Fatal error during app startup:", e);
}), i.on("window-all-closed", () => {
	process.platform !== "darwin" && i.quit();
});
export {};
