import { useEffect, useState } from 'react';

type Props = {
  teacherId: number;
  teacherLabel: string;           // e.g., teacherDisplayName || teacherName
  students: string[];             // names from App.tsx
  onBack: () => void;
};

export default function StudentList({ teacherId, teacherLabel, students, onBack }: Props) {
  const [studentFilter, setStudentFilter] = useState('');
  const [studentPoints, setStudentPoints] = useState<Record<string, number>>({});

  // NEW: sorting state
  const [sortBy, setSortBy] = useState<'name' | 'points'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Load points and ensure every visible student has an entry
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(
          `https://attendance-app-backend-ze6p.onrender.com/api/students/points?teacherId=${teacherId}`
        );
        const map: Record<string, number> = {};
        if (res.ok) {
          const data: { name: string; points: number }[] = await res.json();
          data.forEach(({ name, points }) => (map[name] = points ?? 0));
        }
        // ensure all students have an entry
        students.forEach(n => { if (map[n] === undefined) map[n] = 0; });
        if (isMounted) setStudentPoints(map);
      } catch {
        const map: Record<string, number> = {};
        students.forEach(n => (map[n] = 0));
        if (isMounted) setStudentPoints(map);
      }
    })();
    return () => { isMounted = false; };
  }, [teacherId, students]);

  const bumpPoints = (name: string, delta: number) => {
    setStudentPoints(prev => ({ ...prev, [name]: Math.max(0, (prev[name] ?? 0) + delta) }));
  };

  const setPoints = (name: string, value: string) => {
    const n = Number(value.replace(/[^0-9-]/g, ''));
    setStudentPoints(prev => ({ ...prev, [name]: isNaN(n) ? 0 : Math.max(0, n) }));
  };

  const saveAllPoints = async () => {
    try {
      const payload = Object.entries(studentPoints).map(([name, points]) => ({ name, points }));
      const res = await fetch(
        'https://attendance-app-backend-ze6p.onrender.com/api/students/points/bulk',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, updates: payload }),
        }
      );
      if (!res.ok) throw new Error('Save failed');
      alert('Points saved!');
    } catch (e) {
      console.error(e);
      alert('Failed to save points.');
    }
  };

  // Build filtered + sorted rows
  const rows = students
    .filter(n => n.toLowerCase().includes(studentFilter.toLowerCase()))
    .map(name => ({ name, points: studentPoints[name] ?? 0 }))
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (a.points === b.points) return a.name.localeCompare(b.name) * dir;
      return (a.points - b.points) * dir;
    });

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6">
      <button
        onClick={onBack}
        className="mb-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
      >
        ← Back
      </button>

      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
        Students — {teacherLabel}
      </h1>

      <div className="mb-4">
        <input
          type="text"
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          placeholder="Search students"
          className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
        />
      </div>

      {/* NEW: sort controls */}
<div className="mb-3 flex items-center gap-3">
  <label className="text-sm text-gray-600">Sort by</label>
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as 'name' | 'points')}
    className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
  >
    <option value="name">Name</option>
    <option value="points">Points</option>
  </select>

  {/* Blue Asc/Desc button */}
  <button
    onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
    title="Toggle ascending/descending"
  >
    {sortDir === 'asc' ? 'Asc ↑' : 'Desc ↓'}
  </button>
</div>


      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {/* WIDER points column: 240px */}
        <div className="grid grid-cols-[1fr_240px] px-4 py-3 text-sm font-semibold text-gray-700 border-b">
          <div>Name</div>
          <div className="text-right">Points</div>
        </div>

        {rows.length === 0 ? (
          <p className="p-4 text-gray-600">No students found.</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {rows.map(({ name, points }) => (
              <li key={name} className="grid grid-cols-[1fr_240px] items-center px-4 py-3">
                <div className="text-gray-800">{name}</div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => bumpPoints(name, -1)}
                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                    title="Minus 1"
                  >
                    –
                  </button>
                  {/* wider input */}
                  <input
                    type="number"
                    min={0}
                    value={points}
                    onChange={(e) => setPoints(name, e.target.value)}
                    className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-gray-900"
                  />
                  <button
                    onClick={() => bumpPoints(name, +1)}
                    className="px-2 py-1 rounded border border-gray-300 hover:bg-gray-100"
                    title="Plus 1"
                  >
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={saveAllPoints}
          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
        >
          Save All
        </button>
      </div>
    </div>
  );
}
