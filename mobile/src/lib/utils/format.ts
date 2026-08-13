/**
 * Süre formatlama yardımcıları.
 * Sayaç için HH:MM:SS, özet kartları için "X sa Y dk" gibi.
 */

export function formatHMS(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;
	return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatMS(totalSeconds: number): string {
	// 1 saatten az ise MM:SS, değilse HH:MM:SS
	const s = Math.max(0, Math.floor(totalSeconds));
	if (s < 3600) {
		const minutes = Math.floor(s / 60);
		const seconds = s % 60;
		return `${pad(minutes)}:${pad(seconds)}`;
	}
	return formatHMS(s);
}

export function formatHumanDuration(totalSeconds: number): string {
	// "2 sa 15 dk" / "45 dk" / "0 dk"
	const s = Math.max(0, Math.floor(totalSeconds));
	if (s === 0) return '0 dk';
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	if (hours === 0) return `${minutes} dk`;
	if (minutes === 0) return `${hours} sa`;
	return `${hours} sa ${minutes} dk`;
}

/**
 * Compact human duration — D-072 / Sprint-06 Faz 4 F4.
 * Modal unit standardizasyonu: "139sn" / "5dk" / "1sa 30dk" / "0dk".
 * Negatif → 0dk. Birim-sonra boşluk YOK (UI kompakt görünüm).
 */
export function formatHumanShort(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	if (s === 0) return '0dk';
	if (s < 60) return `${s}sn`;
	const minutes = Math.floor(s / 60);
	if (minutes < 60) return `${minutes}dk`;
	const hours = Math.floor(minutes / 60);
	const remMin = minutes % 60;
	return remMin === 0 ? `${hours}sa` : `${hours}sa ${remMin}dk`;
}

function pad(n: number): string {
	return n.toString().padStart(2, '0');
}

/**
 * Last-seen timestamp — D-070 / Sprint-06 Faz 4 F6.
 * Türkçe locale, relative → absolute fallback:
 *   < 60s → "şimdi"
 *   < 60 dk → "Xdk önce"
 *   < 24 sa → "Xsa önce"
 *   < 7 gün (farklı takvim günü) → "dün HH:MM"
 *   ≥ 7 gün → "DD.MM HH:MM"
 * Negative diff (clock skew) → "şimdi".
 */
export function formatLastSeen(ts: number, now: number = Date.now()): string {
	const diff = now - ts;
	if (diff < 60_000) return 'şimdi';
	if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}dk önce`;
	if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / 3_600_000)}sa önce`;
	if (diff < 7 * 24 * 60 * 60_000) {
		const tsDate = new Date(ts);
		const nowDate = new Date(now);
		if (tsDate.toDateString() !== nowDate.toDateString()) {
			return `dün ${pad(tsDate.getHours())}:${pad(tsDate.getMinutes())}`;
		}
	}
	const d = new Date(ts);
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
