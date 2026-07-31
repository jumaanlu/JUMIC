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

test('a no-show consumes its turn and a late table still waits when the round is ending', () => {
  const queue: SongRequest[] = [
    { ...completedSong('1-r1', 'mesa-1', 1, 10), status: 'no_show' },
    pendingSong('2-r1', 'mesa-2', 2),
    pendingSong('3-r1', 'mesa-3', 3),
  ];

  assert.deepEqual(getNextSongs(queue, []).map(song => song.id), ['2-r1', '3-r1']);
  assert.equal(getProjectedRound(queue, 'mesa-4', 11), 2);
});

test('a table never receives two songs in the same round', () => {
  const queue = [
    pendingSong('1-a', 'mesa-1', 1),
    pendingSong('1-b', 'mesa-1', 2),
    pendingSong('1-c', 'mesa-1', 3),
    pendingSong('2-a', 'mesa-2', 4),
    pendingSong('2-b', 'mesa-2', 5),
    pendingSong('2-c', 'mesa-2', 6),
  ];

  const roundsByTable = new Map<string, number[]>();
  getNextSongs(queue, []).forEach(song => {
    roundsByTable.set(song.tableId, [
      ...(roundsByTable.get(song.tableId) || []),
      song.logicalRound || 1,
    ]);
  });

  roundsByTable.forEach(rounds => assert.equal(new Set(rounds).size, rounds.length));
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

test('35 tables with three requests each are distributed one per round', () => {
  const queue: SongRequest[] = [];
  let createdAt = 1;

  for (let round = 1; round <= 3; round += 1) {
    for (let table = 1; table <= 35; table += 1) {
      queue.push(pendingSong(`mesa-${table}-r${round}`, `mesa-${table}`, createdAt++));
    }
  }

  const ordered = getNextSongs(queue, []);
  assert.equal(ordered.length, 105);

  for (let round = 1; round <= 3; round += 1) {
    const roundSongs = ordered.filter(song => song.logicalRound === round);
    assert.equal(roundSongs.length, 35);
    assert.equal(new Set(roundSongs.map(song => song.tableId)).size, 35);
  }
});

test('a long 20-table event remains fast and keeps future rounds balanced', () => {
  const queue: SongRequest[] = [];
  let clock = 1;

  for (let round = 1; round <= 20; round += 1) {
    const created: SongRequest[] = [];
    for (let table = 1; table <= 20; table += 1) {
      created.push(pendingSong(`mesa-${table}-done-${round}`, `mesa-${table}`, clock++));
    }
    created.forEach(song => {
      queue.push({ ...song, status: 'sung', completedAt: clock++ });
    });
  }

  for (let futureRound = 1; futureRound <= 3; futureRound += 1) {
    for (let table = 1; table <= 20; table += 1) {
      queue.push(pendingSong(`mesa-${table}-pending-${futureRound}`, `mesa-${table}`, clock++));
    }
  }

  const startedAt = performance.now();
  const ordered = getNextSongs(queue, []);
  const elapsedMs = performance.now() - startedAt;

  assert.equal(ordered.length, 60);
  assert.ok(elapsedMs < 1_000, `queue calculation took ${elapsedMs.toFixed(1)} ms`);

  const rounds = new Map<number, SongRequest[]>();
  ordered.forEach(song => {
    const round = song.logicalRound || 1;
    rounds.set(round, [...(rounds.get(round) || []), song]);
  });
  assert.deepEqual([...rounds.values()].map(songs => songs.length), [20, 20, 20]);
  rounds.forEach(songs => {
    assert.equal(new Set(songs.map(song => song.tableId)).size, 20);
  });
});
