import { describe, it, expect, beforeEach } from 'vitest';
import { loadCachedMyRooms, saveCachedMyRooms, MY_ROOMS_CACHE_KEY } from '$lib/stores/rooms.svelte';

describe('rooms-cache', () => {
  beforeEach(() => localStorage.clear());

  it('returns empty array when cache missing', () => {
    expect(loadCachedMyRooms()).toEqual([]);
  });

  it('roundtrips a saved list', () => {
    const items = [{ id: 'r1', name: 'Test', ownerUid: 'u1', inviteCode: 'ABC123', createdAt: 1000, memberCount: 2 }];
    saveCachedMyRooms(items);
    expect(loadCachedMyRooms()).toEqual(items);
  });

  it('returns empty array on corrupted JSON', () => {
    localStorage.setItem(MY_ROOMS_CACHE_KEY, 'not-json');
    expect(loadCachedMyRooms()).toEqual([]);
  });
});
