// ============================================================
// POOL ENTRIES — shared between frontend & backend
// ============================================================
const F1_PTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

const ENTRIES = [
  {
    id: 'f1seer1', name: 'F1SEER_1', owner: 'Alexis', color: '#00d471',
    full:  { A: 'Russell',    B: 'Piastri',   C: 'Bearman',   D: 'Lindblad', E: 'Alonso'    },
    half:  { F: 'Verstappen', G: 'Hamilton',  H: 'Gasly',     I: 'Bortoleto',J: 'Perez'     },
    bonus: { q1: 'mercedes',  q2: 'Leclerc',  q3: 'Russell'  }
  },
  {
    id: 'f1seer2', name: 'F1SEER_2', owner: 'Alexis', color: '#e10600',
    full:  { A: 'Russell',    B: 'Hamilton',  C: 'Bearman',   D: 'Lindblad', E: 'Alonso'    },
    half:  { F: 'Verstappen', G: 'Antonelli', H: 'Gasly',     I: 'Bortoleto',J: 'Perez'     },
    bonus: { q1: 'mercedes',  q2: 'Leclerc',  q3: 'Russell'  }
  },
  {
    id: 'paul', name: 'Datrain33', owner: 'Paul', color: '#ff9b00',
    full:  { A: 'Verstappen', B: 'Piastri',   C: 'Sainz',     D: 'Lawson',   E: 'Perez'     },
    half:  { F: 'Norris',     G: 'Antonelli', H: 'Gasly',     I: 'Albon',    J: 'Alonso'    },
    bonus: { q1: 'mclaren',   q2: 'Verstappen', q3: 'Verstappen' }
  },
  {
    id: 'wife', name: 'Peaches', owner: 'Johana', color: '#ff6bbb',
    full:  { A: 'Russell',    B: 'Piastri',   C: 'Sainz',     D: 'Albon',    E: 'Alonso'    },
    half:  { F: 'Verstappen', G: 'Antonelli', H: 'Gasly',     I: 'Lawson',   J: 'Perez'     },
    bonus: { q1: 'mercedes',  q2: 'Verstappen', q3: 'Russell' }
  }
];

function normName(n) {
  return (n || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').trim();
}

function isFinished(status) {
  if (!status) return false;
  const s = status.toLowerCase();
  return s === 'finished' || s.startsWith('+');
}

function getPointsForPosition(pos, isHalf) {
  const p = parseInt(pos);
  if (p < 1 || p > 10) return 0;
  const pts = F1_PTS[p - 1];
  return isHalf ? pts / 2 : pts;
}

function calcEntryPoints(entry, raceResults) {
  if (entry.pending || !entry.full || !entry.half) {
    return { total: 0, byDriver: {}, byRace: {}, fullPts: 0, halfPts: 0, bonusPts: 0 };
  }
  let fullPts = 0, halfPts = 0;
  const byDriver = {};
  const byRace = {};

  for (const [roundStr, results] of Object.entries(raceResults)) {
    const round = parseInt(roundStr);
    byRace[round] = 0;
    if (!results || !results.length) continue;

    const allPicks = [
      ...Object.entries(entry.full).map(([box, drv]) => ({ box, drv, isHalf: false })),
      ...Object.entries(entry.half).map(([box, drv]) => ({ box, drv, isHalf: true }))
    ];

    for (const { box, drv, isHalf } of allPicks) {
      const result = results.find(r => normName(r.familyName) === normName(drv));
      if (!result) continue;
      let pts = getPointsForPosition(result.position, isHalf);
      if (isFinished(result.status)) pts += 1;
      byDriver[drv] = (byDriver[drv] || 0) + pts;
      byRace[round] = (byRace[round] || 0) + pts;
      if (isHalf) halfPts += pts;
      else fullPts += pts;
    }
  }
  return { total: fullPts + halfPts, fullPts, halfPts, bonusPts: 0, byDriver, byRace };
}

function calcAllEntries(raceResults) {
  return ENTRIES
    .map(e => ({ ...e, points: calcEntryPoints(e, raceResults) }))
    .sort((a, b) => b.points.total - a.points.total);
}

module.exports = { ENTRIES, F1_PTS, normName, isFinished, getPointsForPosition, calcEntryPoints, calcAllEntries };
