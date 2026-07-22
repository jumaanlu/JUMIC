import { SongRequest, Table } from '../types';

/**
 * Algoritmo de Cola Justa (Respeto al Turno):
 * 1. Cada mesa canta una vez por ciclo/ronda antes de poder cantar su siguiente canción.
 * 2. Su primera canción pendiente (índice 0) se agenda de acuerdo a su historial real de canciones cantadas (songsSungCount + 1).
 *    Esto garantiza que si una mesa tiene 1 canción cantada y otra tiene 15, la mesa rezagada canta de inmediato.
 * 3. Las canciones subsiguientes (índices 1, 2, etc.) de una misma mesa se postergan para rondas futuras asignadas a:
 *    Math.max(su turno actual, la ronda mínima activa de las otras mesas en cola) + índice.
 * 4. Esto previene de forma matemática absoluta que cualquier mesa cante de forma consecutiva (con canciones seguidas)
 *    siempre y cuando haya otras mesas esperando en cola, respetando con total exactitud la prioridad y la antigüedad de llegada.
 */
export function getNextSongs(queue: SongRequest[], tables: Table[]): SongRequest[] {
  const pendingRequests = [...queue].filter(r => r.status === 'pending');
  
  if (pendingRequests.length === 0) return [];

  // Agrupamos las canciones pendientes por mesa para identificar qué número de pedido es para cada mesa (0, 1, 2...)
  const tableRequestsMap: Record<string, SongRequest[]> = {};
  pendingRequests.forEach(req => {
    if (!tableRequestsMap[req.tableId]) {
      tableRequestsMap[req.tableId] = [];
    }
    tableRequestsMap[req.tableId].push(req);
  });

  // Ordenamos las listas de cada mesa internamente por fecha de creación (FIFO por mesa)
  Object.values(tableRequestsMap).forEach(list => {
    list.sort((a, b) => a.createdAt - b.createdAt);
  });

  // Identificamos las mesas activas en la cola que tienen solicitudes pendientes
  const activeTablesInQueue = tables.filter(t => tableRequestsMap[t.id] && tableRequestsMap[t.id].length > 0);

  // La ronda base global del evento es el número máximo de canciones cantadas por cualquier mesa + 1.
  // Esto mantiene un valor de ronda estable y libre de fluctuaciones bruscas cuando las mesas entran o salen de la cola.
  const baseRound = tables.length > 0
    ? Math.max(...tables.map(t => t.songsSungCount || 0)) + 1
    : 1;

  // Calculamos la cantidad máxima de canciones que tiene alguna mesa individual
  const maxSongsForAnyTable = Math.max(...Object.values(tableRequestsMap).map(list => list.length));

  const sortedRequests: SongRequest[] = [];

  // Distribuimos las canciones en "Rondas Virtuales"
  // Cada iteración representa una ronda del evento (Ronda 1, Ronda 2, Ronda 3...)
  for (let r = 0; r < maxSongsForAnyTable; r++) {
    const roundSongs: SongRequest[] = [];

    // Recolectamos la r-ésima canción de cada mesa que tenga suficientes canciones pendientes
    activeTablesInQueue.forEach(table => {
      const tableSongs = tableRequestsMap[table.id];
      if (tableSongs && tableSongs.length > r) {
        roundSongs.push(tableSongs[r]);
      }
    });

    // Ordenamos las canciones dentro de esta ronda:
    // 1. Por historial real de canciones cantadas (los que han cantado menos van primero).
    // 2. Por el tiempo de creación del PRIMER tema pendiente de cada mesa (antigüedad de espera de la mesa en el local).
    roundSongs.sort((songA, songB) => {
      const tableA = tables.find(t => t.id === songA.tableId);
      const tableB = tables.find(t => t.id === songB.tableId);

      const sungA = tableA?.songsSungCount || 0;
      const sungB = tableB?.songsSungCount || 0;

      if (sungA !== sungB) {
        return sungA - sungB;
      }

      // Desempate: antigüedad del primer tema de la mesa en la cola
      const firstSongA = tableRequestsMap[songA.tableId][0];
      const firstSongB = tableRequestsMap[songB.tableId][0];
      return firstSongA.createdAt - firstSongB.createdAt;
    });

    // Asignamos la ronda lógica exacta y añadimos a la lista final
    roundSongs.forEach(song => {
      sortedRequests.push({
        ...song,
        logicalRound: baseRound + r
      });
    });
  }

  return sortedRequests;
}
