import { SongRequest, Table } from '../types';

interface Assignment {
  round: number;
  order: number;
  tableOrder: number;
}

interface QueueEvent {
  at: number;
  type: 'create' | 'complete';
  request: SongRequest;
}

interface RoundStart {
  at: number;
  previousTableId?: string;
}

interface QueuePlan {
  assignments: Map<string, Assignment>;
  roundStarts: Map<number, RoundStart>;
}

/**
 * Reconstructs stable karaoke rounds from the immutable request history.
 *
 * Rules:
 * - A table can have only one song in each round.
 * - A new table joins the end of the round that is active when it requests.
 * - Extra songs from the same table go to consecutive future rounds.
 * - Completed-song totals never give a late table permission to jump the line.
 * - A table cannot close one round and open the next while another table waits.
 * - Once a round starts, late arrivals are appended without moving its next table.
 */
function buildAssignments(queue: SongRequest[]): QueuePlan {
  const events: QueueEvent[] = [];

  queue.forEach(request => {
    events.push({ at: request.createdAt, type: 'create', request });

    if (request.status === 'sung' || request.status === 'no_show' || request.status === 'removed') {
      events.push({
        at: request.completedAt ?? request.createdAt,
        type: 'complete',
        request,
      });
    }
  });

  events.sort((a, b) =>
    a.at - b.at
    || (a.type === b.type ? 0 : a.type === 'create' ? -1 : 1)
    || a.request.id.localeCompare(b.request.id)
  );

  const assignments = new Map<string, Assignment>();
  const lastRoundByTable = new Map<string, number>();
  const tableOrder = new Map<string, number>();
  const pendingByRound = new Map<number, number>();
  const roundStarts = new Map<number, RoundStart>([[1, { at: 0 }]]);
  let currentRound = 1;
  let nextOrder = 1;
  let nextTableOrder = 1;

  events.forEach(event => {
    if (event.type === 'create') {
      const tableNextRound = (lastRoundByTable.get(event.request.tableId) ?? 0) + 1;
      const round = Math.max(currentRound, tableNextRound);
      if (!tableOrder.has(event.request.tableId)) {
        tableOrder.set(event.request.tableId, nextTableOrder++);
      }

      assignments.set(event.request.id, {
        round,
        order: nextOrder++,
        tableOrder: tableOrder.get(event.request.tableId)!,
      });
      lastRoundByTable.set(event.request.tableId, round);
      pendingByRound.set(round, (pendingByRound.get(round) ?? 0) + 1);
      return;
    }

    const assignment = assignments.get(event.request.id);
    if (!assignment) return;

    pendingByRound.set(
      assignment.round,
      Math.max(0, (pendingByRound.get(assignment.round) ?? 0) - 1)
    );

    if (assignment.round !== currentRound || (pendingByRound.get(currentRound) ?? 0) > 0) {
      return;
    }

    const nextActiveRound = [...pendingByRound.entries()]
      .filter(([round, pending]) => round > currentRound && pending > 0)
      .map(([round]) => round)
      .sort((a, b) => a - b)[0];

    currentRound = nextActiveRound ?? currentRound + 1;
    roundStarts.set(currentRound, {
      at: event.at,
      previousTableId: event.request.tableId,
    });
  });

  return { assignments, roundStarts };
}

export function getNextSongs(queue: SongRequest[], _tables: Table[]): SongRequest[] {
  const { assignments, roundStarts } = buildAssignments(queue);
  const pendingSongs = queue
    .filter(request => request.status === 'pending')
    .map(request => ({
      ...request,
      logicalRound: assignments.get(request.id)?.round ?? 1,
    }))
    .sort((a, b) => {
      const assignmentA = assignments.get(a.id);
      const assignmentB = assignments.get(b.id);

      return (assignmentA?.round ?? 1) - (assignmentB?.round ?? 1)
        || (assignmentA?.tableOrder ?? 0) - (assignmentB?.tableOrder ?? 0)
        || (assignmentA?.order ?? 0) - (assignmentB?.order ?? 0)
        || a.id.localeCompare(b.id);
    });

  const rounds = new Map<number, SongRequest[]>();
  pendingSongs.forEach(song => {
    const round = song.logicalRound ?? 1;
    rounds.set(round, [...(rounds.get(round) ?? []), song]);
  });

  const orderedSongs: SongRequest[] = [];
  let previousTableId: string | undefined;
  [...rounds.keys()].sort((a, b) => a - b).forEach(round => {
    let roundSongs = rounds.get(round) ?? [];
    const roundStart = roundStarts.get(round);

    if (roundStart) {
      previousTableId = roundStart.previousTableId;
      const waitingAtStart = roundSongs.filter(song => song.createdAt <= roundStart.at);
      const lateArrivals = roundSongs
        .filter(song => song.createdAt > roundStart.at)
        .sort((a, b) =>
          (assignments.get(a.id)?.order ?? 0) - (assignments.get(b.id)?.order ?? 0)
        );

      roundSongs = [...waitingAtStart, ...lateArrivals];
    }

    const waitingCount = roundStart
      ? roundSongs.filter(song => song.createdAt <= roundStart.at).length
      : roundSongs.length;

    if (waitingCount > 1 && roundSongs[0].tableId === previousTableId) {
      const nextTableIndex = roundSongs
        .slice(0, waitingCount)
        .findIndex(song => song.tableId !== previousTableId);
      const waitingSongs = roundSongs.slice(0, waitingCount);
      roundSongs = [
        ...waitingSongs.slice(nextTableIndex),
        ...waitingSongs.slice(0, nextTableIndex),
        ...roundSongs.slice(waitingCount),
      ];
    }

    orderedSongs.push(...roundSongs);
    previousTableId = roundSongs.at(-1)?.tableId ?? previousTableId;
  });

  return orderedSongs;
}

export function getProjectedRound(
  queue: SongRequest[],
  tableId: string,
  createdAt = Date.now()
): number {
  const projectionId = `projection-${createdAt}-${tableId}`;
  const projectedRequest: SongRequest = {
    id: projectionId,
    tableId,
    singerName: '',
    songTitle: '',
    artistName: '',
    status: 'pending',
    createdAt,
  };

  return buildAssignments([...queue, projectedRequest]).assignments.get(projectionId)?.round ?? 1;
}
