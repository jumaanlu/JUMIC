import assert from 'node:assert/strict';
import test from 'node:test';
import { SongRequest } from '../types';
import { getNextSongs, getProjectedRound } from './fairQueue';

const completedSong = (
  id: string,
  tableId: string,
  createdAt: number,
  completedAt: number
): SongRequest => ({
  id,
  tableId,
  singerName: tableId,
  songTitle: id,
  artistName: 'Artista',
  status: 'sung',
  createdAt,
  completedAt,
});

const pendingSong = (
  id: string,
  tableId: string,
  createdAt: number
): SongRequest => ({
  id,
  tableId,
  singerName: tableId,
  songTitle: id,
  artistName: 'Artista',
  status: 'pending',
  createdAt,
});

const historyThroughRoundFour: SongRequest[] = [
  completedSong('31-r1', 'mesa-31', 1, 10),
  completedSong('35-r1', 'mesa-35', 2, 11),
  completedSong('33-r1', 'mesa-33', 3, 12),
  completedSong('31-r2', 'mesa-31', 13, 20),
  completedSong('35-r2', 'mesa-35', 14, 21),
  completedSong('33-r2', 'mesa-33', 15, 22),
  completedSong('31-r3', 'mesa-31', 23, 30),
  completedSong('35-r3', 'mesa-35', 24, 31),
  completedSong('33-r3', 'mesa-33', 25, 32),
  completedSong('31-r4', 'mesa-31', 33, 40),
  completedSong('35-r4', 'mesa-35', 34, 41),
  completedSong('33-r4', 'mesa-33', 35, 42),
];

test('a new table moves to the next round when only one current-round turn remains', () => {
  const queue = [
    ...historyThroughRoundFour,
    completedSong('31-r5', 'mesa-31', 43, 50),
    completedSong('35-r5', 'mesa-35', 44, 51),
    pendingSong('33-r5', 'mesa-33', 45),
  ];

  assert.equal(getProjectedRound(queue, 'mesa-32', 52), 6);
});

test('the same minimum wait applies near the end of the first round', () => {
  const queue = [
    completedSong('31-r1', 'mesa-31', 1, 10),
    pendingSong('35-r1', 'mesa-35', 2),
  ];

  assert.equal(getProjectedRound(queue, 'mesa-32', 11), 2);
});

test('a new table may join the current round when three existing turns remain', () => {
  const queue = [
    ...historyThroughRoundFour,
    pendingSong('31-r5', 'mesa-31', 43),
    pendingSong('35-r5', 'mesa-35', 44),
    pendingSong('33-r5', 'mesa-33', 45),
  ];

  assert.equal(getProjectedRound(queue, 'mesa-32', 46), 5);
});

test('adding a late table never changes the order of existing pending songs', () => {
  const queue = [
    ...historyThroughRoundFour,
    completedSong('31-r5', 'mesa-31', 43, 50),
    completedSong('35-r5', 'mesa-35', 44, 51),
    pendingSong('33-r5', 'mesa-33', 45),
    pendingSong('31-r6', 'mesa-31', 46),
    pendingSong('35-r6', 'mesa-35', 47),
  ];
  const before = getNextSongs(queue, []).map(song => song.id);
  const after = getNextSongs([
    ...queue,
    pendingSong('32-r6', 'mesa-32', 52),
  ], []).map(song => song.id);

  assert.deepEqual(after.filter(id => id !== '32-r6'), before);
  assert.equal(after.at(-1), '32-r6');
});
