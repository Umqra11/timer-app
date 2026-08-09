/**
 * Rooms Store — D-013 (hero layout), D-014 (last-joined hero), D-048 (memberCount), D-049 (delete)
 *
 * Veri kaynağı: Firestore (D-009/D-020). Firebase config yoksa offline
 * fallback: localStorage'a mock seed yazıp oradan okur (lokal geliştirme).
 *
 * Public API:
 *   - rooms.list        : tüm odalar (joinAt desc)
 *   - rooms.sorted      : list'in sıralanmış kopyası
 *   - rooms.hero        : son katıldığın oda (yoksa en yeni)
 *   - rooms.others      : hero hariç diğer odalar
 *   - rooms.create(name): yeni oda oluşturur, davet kodu üretir, katılır
 *   - rooms.join(code)  : koda göre oda bulunur ve katılınır
 *   - rooms.makeHero(id): bir odayı "son açılan" yap
 *   - rooms.delete(id) : odayı sil (sadece sahibi, D-049, server-side check)
 *   - rooms.subscribe() : bağlamak için (rooms/+page.svelte mount'unda çağrılır)
 *   - rooms.dispose()   : Firestore dinlemesini bırak
 */

import { isFirebaseEnabled } from '$lib/firebase/client';
import * as fb from '$lib/firebase/rooms';

export type Room = {
	id: string;
	name: string;
	members: number;
	createdAt: number;
	joinAt?: number;
	inviteCode: string;
};

/** I1: store'un discriminated union result tipleri. */
export type CreateRoomResult =
	| { ok: true; room: Room }
	| { ok: false; reason: 'already-in-room' | 'invalid' | 'unavailable' | 'error' };

export type JoinRoomResult =
	| { ok: true; room: Room }
	| { ok: false; reason: 'already-in-room' | 'invalid' | 'not-found' | 'unavailable' | 'error' };

const STORAGE_KEY = 'timer_rooms';
const LAST_JOINED_KEY = 'timer_last_joined';

const SEED_ROOMS: Omit<Room, 'joinAt'>[] = [
	{
		id: 'room_seed_1',
		name: 'Akademi Cafe',
		members: 8,
		createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
		inviteCode: 'AKDM42'
	},
	{
		id: 'room_seed_2',
		name: 'Final Haftası',
		members: 14,
		createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
		inviteCode: 'FNAL99'
	},
	{
		id: 'room_seed_3',
		name: 'sessiz çalışma',
		members: 3,
		createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
		inviteCode: 'SSZ777'
	},
	{
		id: 'room_seed_4',
		name: 'yazılım grubu',
		members: 21,
		createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
		inviteCode: 'YZLM21'
	}
];

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateInviteCode(): string {
	let out = '';
	for (let i = 0; i < 6; i++) {
		out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
	}
	return out;
}

function loadLocal(): Room[] {
	if (typeof localStorage === 'undefined') return [];
	const raw = localStorage.getItem(STORAGE_KEY);
	if (raw) {
		try {
			const parsed = JSON.parse(raw) as Room[];
			if (Array.isArray(parsed)) return parsed;
		} catch {
			// bozuk veri — seed'le
		}
	}
	const seeded: Room[] = SEED_ROOMS.map((r) => ({ ...r, joinAt: r.createdAt }));
	saveLocal(seeded);
	return seeded;
}

function saveLocal(items: Room[]) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadLastJoinedId(): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(LAST_JOINED_KEY);
}

function saveLastJoinedId(id: string) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(LAST_JOINED_KEY, id);
}

function createRoomsStore() {
	const initial: Room[] = isFirebaseEnabled() ? [] : loadLocal();
	let list = $state<Room[]>(initial);
	// D-059: pre-check için Firestore snapshot cache. İlk snapshot öncesi boş —
	// race window kabul (D-015).
	let myRoomsCache = $state<fb.RoomMeta[]>([]);

	const sorted = $derived([...list].sort((a, b) => (b.joinAt ?? 0) - (a.joinAt ?? 0)));

	const hero = $derived<Room | null>(
		sorted.length === 0
			? null
			: (() => {
					const lastId = loadLastJoinedId();
					if (lastId) {
						const lastRoom = sorted.find((r) => r.id === lastId);
						if (lastRoom) return lastRoom;
					}
					return sorted[0] ?? null;
				})()
	);

	const others = $derived<Room[]>(hero ? sorted.filter((r) => r.id !== hero.id) : []);

	let unsubscribe: (() => void) | null = null;

	function mergeFromFirestore(items: fb.RoomMeta[]): Room[] {
		return items.map((m) => ({
			id: m.id,
			name: m.name,
			members: m.memberCount,
			createdAt: m.createdAt,
			joinAt: m.joinedAt,
			inviteCode: m.inviteCode
		}));
	}

	function removeFromLocalStorage(id: string) {
		if (typeof localStorage === 'undefined') return;
		if (loadLastJoinedId() === id) {
			localStorage.removeItem(LAST_JOINED_KEY);
		}
	}

	return {
		get list() {
			return list;
		},
		get sorted() {
			return sorted;
		},
		get hero() {
			return hero;
		},
		get others() {
			return others;
		},
		/** Component mount'unda çağır: Firestore dinlemeye başla (veya local seed yükle). */
		subscribe(): void {
			if (unsubscribe) return;
			if (!isFirebaseEnabled()) {
				// offline: zaten yüklendi
				return;
			}
			unsubscribe = fb.subscribeMyRooms((remote) => {
				myRoomsCache = remote;
				list = mergeFromFirestore(remote);
			});
		},
		dispose(): void {
			if (unsubscribe) {
				unsubscribe();
				unsubscribe = null;
			}
		},
		/**
		 * Store üzerinden subscribeMyRooms — D-059 pre-check cache'i her tüketicide
		 * (örn. /leaderboard) güncel kalsın. Doğrudan fb.subscribeMyRooms çağrısı
		 * cache'i atlar; bunun yerine bu fonksiyonu kullan.
		 *
		 * Returns: unsubscribe fonksiyonu
		 */
		subscribeMyRooms(
			cb: (items: fb.RoomMeta[]) => void,
			onError?: (err: Error) => void
		): () => void {
			if (!isFirebaseEnabled()) {
				cb([]);
				return () => {};
			}
			return fb.subscribeMyRooms(
				(remote) => {
					myRoomsCache = remote;
					list = mergeFromFirestore(remote);
					cb(remote);
				},
				onError
			);
		},
		/** Yeni oda oluştur. Kullanıcı otomatik katılır, hero olur. */
		async create(name: string): Promise<CreateRoomResult> {
			const trimmed = name.trim();
			if (trimmed.length === 0 || trimmed.length > 40) {
				return { ok: false, reason: 'invalid' };
			}

			// D-059: kullanıcı zaten bir odada — yeni oda oluşturmayı engelle
			if (myRoomsCache.length >= 1) {
				return { ok: false, reason: 'already-in-room' };
			}

			if (isFirebaseEnabled()) {
				const res = await fb.createRoom(trimmed);
				if (!res.ok) return res;
				const created = res.room;
				saveLastJoinedId(created.id);
				const local: Room = {
					id: created.id,
					name: created.name,
					members: created.memberCount,
					createdAt: created.createdAt,
					joinAt: Date.now(),
					inviteCode: created.inviteCode
				};
				list = [local, ...list.filter((r) => r.id !== local.id)];
				return { ok: true, room: local };
			}

			const now = Date.now();
			const room: Room = {
				id: `room_${now}_${Math.random().toString(36).slice(2, 8)}`,
				name: trimmed,
				members: 1,
				createdAt: now,
				joinAt: now,
				inviteCode: generateInviteCode()
			};
			list = [room, ...list];
			saveLocal(list);
			saveLastJoinedId(room.id);
			return { ok: true, room };
		},
		/** Davet koduna göre odaya katıl. */
		async joinByCode(code: string): Promise<JoinRoomResult> {
			const target = code.trim().toUpperCase();
			if (!target) return { ok: false, reason: 'invalid' };

			// D-059: kullanıcı zaten bir odada — ikinci odaya katılmayı engelle
			if (myRoomsCache.length >= 1) {
				return { ok: false, reason: 'already-in-room' };
			}

			if (isFirebaseEnabled()) {
				const res = await fb.joinRoomByCode(target);
				if (!res.ok) return res;
				const joined = res.room;
				saveLastJoinedId(joined.id);
				const local: Room = {
					id: joined.id,
					name: joined.name,
					members: joined.memberCount,
					createdAt: Date.now(),
					joinAt: Date.now(),
					inviteCode: joined.inviteCode
				};
				list = [local, ...list.filter((r) => r.id !== local.id)];
				return { ok: true, room: local };
			}

			const idx = list.findIndex((r) => r.inviteCode === target);
			if (idx === -1) return { ok: false, reason: 'not-found' };
			const now = Date.now();
			const updated: Room = {
				...list[idx],
				joinAt: now,
				members: list[idx].members + 1
			};
			const next = [...list];
			next[idx] = updated;
			list = next;
			saveLocal(list);
			saveLastJoinedId(updated.id);
			return { ok: true, room: updated };
		},
		/** Bir odayı "son açılan" yap — D-014 hero. */
		async makeHero(roomId: string): Promise<boolean> {
			saveLastJoinedId(roomId);
			if (isFirebaseEnabled()) {
				await fb.touchRoom(roomId);
				return true;
			}
			const idx = list.findIndex((r) => r.id === roomId);
			if (idx === -1) return false;
			const now = Date.now();
			const updated: Room = { ...list[idx], joinAt: now };
			const next = [...list];
			next[idx] = updated;
			list = next;
			saveLocal(list);
			return true;
		},
		/** Odayı sil — D-049. Server-side owner check (firestore.rules). */
		async delete(roomId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
			if (!isFirebaseEnabled()) {
				const next = list.filter((r) => r.id !== roomId);
				if (next.length === list.length) return { ok: false, reason: 'not-found' };
				list = next;
				saveLocal(list);
				removeFromLocalStorage(roomId);
				return { ok: true };
			}
			const res = await fb.deleteRoom(roomId);
			if (res.ok) {
				list = list.filter((r) => r.id !== roomId);
				removeFromLocalStorage(roomId);
			}
			return res;
		}
	};
}

export const rooms = createRoomsStore();
