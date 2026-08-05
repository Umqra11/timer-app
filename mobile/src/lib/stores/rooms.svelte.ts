/**
 * Rooms Store — D-013 (hero layout), D-014 (son katıldığın oda hero olur)
 *
 * Şimdilik mock data + localStorage. Sprint-02 devamında Firestore query'leri
 * ile değiştirilecek (D-009/D-020):
 *   - koleksiyon: rooms/{roomId}
 *   - alanlar:    name, members[], createdAt, lastJoinedAt (kullanıcı başına)
 *
 * Public API:
 *   - rooms.list        : tüm odalar (joinAt desc)
 *   - rooms.hero        : son katıldığın oda (yoksa en yeni)
 *   - rooms.others      : hero hariç diğer odalar
 *   - rooms.create(name): yeni oda oluşturur, davet kodu üretir, kullanıcıyı ekler
 *   - rooms.join(code)  : koda göre oda bulunur ve kullanıcı katılır
 *
 * Davet kodları 6 karakterlik base36 string (36^6 ≈ 2.2 milyar kombinasyon).
 */

const STORAGE_KEY = 'timer_rooms';
const LAST_JOINED_KEY = 'timer_last_joined';

export type Room = {
	id: string;
	name: string;
	members: number; // mocklarda üye sayısı, gerçekte members.length
	createdAt: number; // unix ms
	joinAt?: number; // kullanıcının bu odaya katıldığı zaman (localStorage'lı)
	inviteCode: string;
};

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

function generateInviteCode(): string {
	// 6 base36 karakter (A-Z 0-9) — çakışma ihmal edilebilir (2.2M kombinasyon).
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let out = '';
	for (let i = 0; i < 6; i++) {
		out += chars[Math.floor(Math.random() * chars.length)];
	}
	return out;
}

function loadRooms(): Room[] {
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
	// seed ile başla, tüm seed odalarda joinAt = createdAt
	const seeded: Room[] = SEED_ROOMS.map((r) => ({ ...r, joinAt: r.createdAt }));
	saveRooms(seeded);
	return seeded;
}

function saveRooms(rooms: Room[]) {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
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
	let list = $state<Room[]>(loadRooms());

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

	const others = $derived<Room[]>(
		hero ? sorted.filter((r) => r.id !== hero.id) : []
	);

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
		/** Yeni oda oluştur. Kullanıcı otomatik katılır, hero olur. */
		create(name: string): Room | null {
			const trimmed = name.trim();
			if (trimmed.length === 0 || trimmed.length > 40) return null;

			const now = Date.now();
			const room: Room = {
				id: `room_${now}_${Math.random().toString(36).slice(2, 8)}`,
				name: trimmed,
				members: 1,
				createdAt: now,
				joinAt: now,
				inviteCode: generateInviteCode()
			};
			list = [...list, room];
			saveRooms(list);
			saveLastJoinedId(room.id);
			return room;
		},
		/** Davet koduna göre odaya katıl. Kullanıcıyı ekler, hero yapar. */
		joinByCode(code: string): Room | null {
			const target = code.trim().toUpperCase();
			if (!target) return null;
			const idx = list.findIndex((r) => r.inviteCode === target);
			if (idx === -1) return null;

			const now = Date.now();
			const updated: Room = {
				...list[idx],
				joinAt: now,
				members: list[idx].members + 1
			};
			const next = [...list];
			next[idx] = updated;
			list = next;
			saveRooms(list);
			saveLastJoinedId(updated.id);
			return updated;
		},
		/** Bir odayı "son katıldığım" yap — hero olsun. */
		makeHero(roomId: string): boolean {
			const idx = list.findIndex((r) => r.id === roomId);
			if (idx === -1) return false;
			const now = Date.now();
			const updated: Room = { ...list[idx], joinAt: now };
			const next = [...list];
			next[idx] = updated;
			list = next;
			saveRooms(list);
			saveLastJoinedId(roomId);
			return true;
		}
	};
}

export const rooms = createRoomsStore();
