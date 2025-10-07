import { useState, useEffect } from 'react';
import './App.css';
import './index.css';
import AdminDashboard from './components/AdminDashboard';
import StudentList from './components/StudentList';
import Login from './components/Login';
import React from 'react';

type AttendanceStatus = 'Present' | 'Absent';
type AttendanceRecords = Record<string, AttendanceStatus>;

export default function AttendanceApp() {
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [teacherRole, setTeacherRole] = useState<'teacher' | 'admin'>('teacher');
  const [teacherName, setTeacherName] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [students, setStudents] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecords>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [attendanceLocked, setAttendanceLocked] = useState(false);
  const [showAttendanceScreen, setShowAttendanceScreen] = useState(false); // <-- NEW STATE
  const [teacherDisplayName, setTeacherDisplayName] = useState('');
  const [showActivityScreen, setShowActivityScreen] = useState(false);
  const [activityStudents, setActivityStudents] = useState<string[]>([]);
  const [weeklyActivities, setWeeklyActivities] = useState<Record<string, Record<string, string>>>({});

  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const isToday = selectedDate === today;

  const allDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'short' });
const isWeekend = todayDay === 'Sat' || todayDay === 'Sun';
  const [showStudentList, setShowStudentList] = useState(false);


const [visibleDays, setVisibleDays] = useState<string[]>(
  isWeekend ? allDays : [todayDay]
);

const toggleDay = (day: string) => {
  setVisibleDays((prev) =>
    prev.includes(day)
      ? prev.filter((d) => d !== day)
      : [...prev, day].sort((a, b) => allDays.indexOf(a) - allDays.indexOf(b))
  );
};

  const fetchLockStatus = async () => {
    const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/attendance/lock-status');
    const data = await res.json();
    setAttendanceLocked(data.locked);
  };

const fetchTeacherDisplayName = async (id: number) => {
  try {
    const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/teacher/${id}/display-name`);
    if (res.ok) {
      const data = await res.json();
      const rawDisplay = data.class_display_name;

      const match = rawDisplay.match(/\(([^)]+)\)/);
      const extractedName = match ? match[1] : rawDisplay;

      setTeacherDisplayName(extractedName);
    }
  } catch (err) {
    console.error('Failed to fetch display name:', err);
  }
};

const loadActivityStudents = async () => {
  if (!teacherId) return;

  try {
    const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students/activities?teacherId=${teacherId}`);
    const data: { name: string; day_of_week: string; activity: string }[] = await res.json();

    const grouped: Record<string, Record<string, string>> = {};
    data.forEach((entry) => {
      if (!grouped[entry.name]) grouped[entry.name] = {};
      grouped[entry.name][entry.day_of_week] = entry.activity;
    });

    const names = [...new Set(data.map((s) => s.name))].sort((a, b) =>
  a.localeCompare(b)
);
    setActivityStudents(names); // ✅ Now types align
    setWeeklyActivities(grouped);
    setShowActivityScreen(true);
  } catch (err) {
    console.error('Error loading activity students:', err);
    alert('Could not load students.');
  }
};

  const handleAddStudent = async () => {
    if (!teacherId || !newStudentName.trim()) return;

    try {
      const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, teacherId }),
      });

      if (!res.ok) throw new Error('Failed to add student');
      setNewStudentName('');
      const refreshed = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students?teacherId=${teacherId}&date=${today}`);
      const data = await refreshed.json();
      const names = data.map((s: { name: string }) => s.name);
      setStudents(names);
    } catch (err) {
      alert('Failed to add student');
    }
  };

  useEffect(() => {
    if (teacherId === null) return;
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students?teacherId=${teacherId}&date=${selectedDate}`);
        if (!res.ok) throw new Error('Failed to fetch students');
        const data = await res.json();
        const names = data.map((student: { name: string }) => student.name);
        const savedRecords: AttendanceRecords = {};
        data.forEach((student: { name: string; status?: AttendanceStatus }) => {
          if (student.status) savedRecords[student.name] = student.status;
        });
        setStudents(names);
        setAttendanceRecords(savedRecords);
        setSelectedStudent(names[0] || null);
      } catch (err) {
        console.error(err);
        setError('Failed to load students.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [teacherId, selectedDate]);

const handleLogin = async () => {
  try {
    const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/teacher/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teacherName, password: teacherPassword }),
    });

    if (!res.ok) {
      setError('Invalid name or password');
      return;
    }

    const data = await res.json();
    setTeacherId(data.id);
    setTeacherRole(data.role);
    await fetchTeacherDisplayName(data.id);
    await fetchLockStatus();
    setError(null);
  } catch (err) {
    console.error(err);
    setError('Login failed');
  }
};

  const markAttendance = (studentName: string, status: AttendanceStatus) => {
    if (attendanceLocked) return;
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentName]: status,
    }));
    const currentIndex = students.indexOf(studentName);
    const nextIndex = (currentIndex + 1) % students.length;
    setSelectedStudent(students[nextIndex]);
  };

  const handleSubmit = async () => {
    try {
      for (const studentName of Object.keys(attendanceRecords)) {
        await fetch('https://attendance-app-backend-ze6p.onrender.com/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teacherId, studentName, status: attendanceRecords[studentName], date: today }),
        });
      }
      // setSubmitted(true);
      alert('Attendance submitted.');
    } catch (err) {
      console.error('Error submitting attendance:', err);
      alert('Failed to submit attendance.');
    }
  };


if (teacherId === null) {
return (
  <Login
    teacherName={teacherName}
    setTeacherName={setTeacherName}
    teacherPassword={teacherPassword}
    setTeacherPassword={setTeacherPassword}
    handleLogin={handleLogin}
    error={error}
  />
);
}

if (teacherRole === 'admin') {
  return (
    <AdminDashboard
      teacherId={teacherId}
      isAdmin={true}
      teacherName={teacherName}
      classDisplayName={teacherDisplayName} // ✅ Add this
    />
  );
}
  
  if (showActivityScreen) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6">
        <button
          onClick={() => setShowActivityScreen(false)}
          className="mb-4 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ← Back
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-4 sm:mb-6">
          Activities for {teacherDisplayName || teacherName}
        </h1>

        <div className="bg-white rounded-lg shadow overflow-x-auto max-h-[75vh]">
          <div className="sticky top-0 z-10 bg-white py-2 border-b border-gray-200">
            <div className="flex justify-center gap-2 flex-wrap px-2">
              {allDays.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1 rounded-full text-sm font-medium border transition ${
                    visibleDays.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-[700px] p-4">
            <div className="grid grid-cols-[200px_1fr] items-center mb-2">
              <div className="text-sm font-semibold text-left text-gray-700">Students</div>
              <div
                className="grid gap-2 text-sm font-semibold text-center text-gray-700"
                style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
              >
                {visibleDays.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[200px_1fr] gap-4">
              {activityStudents.map((student, index) => (
                <React.Fragment key={student}>
                  <div className={`text-right pr-2 font-medium flex items-center ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} text-gray-800`}>
                    {student}
                  </div>
                  <div
                    className={`grid gap-2 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                    style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}
                  >
                    {visibleDays.map((day) => (
                      <input
                        key={day}
                        type="text"
                        placeholder={day}
                        value={weeklyActivities[student]?.[day] || ''}
                        onChange={(e) => {
                          setWeeklyActivities((prev) => ({
                            ...prev,
                            [student]: {
                              ...prev[student],
                              [day]: e.target.value,
                            },
                          }));
                        }}
                        className="border border-gray-300 p-2 rounded text-sm w-full text-black bg-white placeholder-gray-500"
                      />
                    ))}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              for (const student of activityStudents) {
                if (!weeklyActivities[student] || Object.keys(weeklyActivities[student]).length === 0) continue;

                const response = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students/${encodeURIComponent(student)}/activities`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(weeklyActivities[student]),
                });

                if (!response.ok) throw new Error(`Failed to update ${student}`);
              }

              alert('Activities updated!');
            } catch (err) {
              console.error('Failed to update activities:', err);
              alert('Failed to update activities.');
            }
          }}
          className="mt-6 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 w-full sm:w-auto"
        >
          Save All
        </button>
      </div>
    );
  }

if (showStudentList) {
  return (
    <StudentList
      teacherId={teacherId!}
      teacherLabel={teacherDisplayName || teacherName}
      students={students}
      onBack={() => setShowStudentList(false)}
    />
  );
}
  
if (!showAttendanceScreen) {
  return (
    <div className="min-h-screen bg-white p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
<h1 className="text-2xl font-bold text-gray-800 leading-snug text-center">
  Welcome, {teacherDisplayName || teacherName}!
</h1>
        <button className="text-2xl text-gray-600">☰</button> {/* menu icon placeholder */}
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search Space"
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
        />
      </div>

      {/* Categories */}
      <h2 className="text-lg font-semibold text-gray-700 mb-3">Categories</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
  {/* Attendance Button Card */}
  <button
    onClick={() => setShowAttendanceScreen(true)}
    className="border border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 hover:bg-blue-50 transition"
  >
    <div className="text-3xl text-blue-600 mb-2">📝</div>
    <span className="text-gray-800 font-medium">Attendance</span>
  </button>

  {/* Optional: show disabled placeholder */}
<button
  onClick={loadActivityStudents}
  className="border border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 hover:bg-green-50 transition"
>
  <div className="text-3xl mb-2">🏡</div>
  <span className="text-gray-800 font-medium">Activity</span>
</button>

  {/* Other placeholders */}
  <div className="border border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 text-gray-400">
    <div className="text-3xl mb-2">📅</div>
    <span>Update</span>
  </div>
  <div className="border border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 bg-purple-100 text-purple-700 font-medium">
    All
  </div>
</div>

      {/* Recent Booking Placeholder */}
<h2 className="text-xl font-semibold mt-8 text-center text-gray-700">Squid Games</h2>
<button
  onClick={() => setShowStudentList(true)}
  className="w-full border border-purple-300 rounded-lg p-4 flex items-center justify-between hover:bg-purple-50 transition"
>
  <span className="text-gray-800 font-medium">View Student List</span>
  <span className="text-purple-600 font-bold">→</span>
</button>

    </div>
  );
}
  
  return (
    <>
          {/* Go Back to Home button */}
    <div className="mb-4">
      <button
        onClick={() => setShowAttendanceScreen(false)}
        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
      >
        ← Go Back
      </button>
    </div>
      
      <div className="mb-4">
      <h3 className="text-lg font-semibold mb-2 text-gray-800">Add Student</h3>
      <input
        type="text"
        placeholder="Student Name"
        value={newStudentName}
        onChange={(e) => setNewStudentName(e.target.value)}
        className="p-2 border rounded w-full text-white mb-2"
      />
      <button
        onClick={handleAddStudent}
        // disabled={attendanceLocked}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        Add Student
      </button>
    </div>
      <div className="bg-white py-3 px-6 text-gray-700 flex justify-between items-center">
        <div className="text-lg font-medium">
          Attendance for: {selectedDate}
        </div>
        <input
          type="date"
          value={selectedDate}
          max={today}
          onChange={(e) => {
            // const chosen = e.target.value;
            // if (chosen < minAllowedDate) {
            //   alert('Cannot view attendance before July 13, 2025.');
            //   return;
            // }
            setSelectedDate(e.target.value);
          }}
          className="border p-2 rounded text-black"
        />
      </div>
      <div className="flex flex-col md:flex-row h-screen">
        <div className="md:w-7/10 flex items-center justify-center bg-gray-50 p-6">
          {loading ? (
            <div className="text-gray-500 text-xl">Loading students...</div>
          ) : error ? (
            <div className="text-red-600 text-xl">{error}</div>
          ) : selectedStudent ? (
            <div className="bg-white rounded-lg shadow-lg p-10 w-full max-w-md text-center">
              <h2 className="text-3xl font-semibold mb-8 text-gray-800">{selectedStudent}</h2>
              <div className="flex gap-6 justify-center">
                <button
                  disabled={!isToday || attendanceLocked}
                  className={`flex-1 py-4 rounded-lg text-white transition ${!isToday || attendanceLocked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600'
                    }`}
                  onClick={() => markAttendance(selectedStudent!, 'Present')}
                >
                  Present
                </button>

                <button
                  disabled={!isToday || attendanceLocked}
                  className={`flex-1 py-4 rounded-lg text-white transition ${!isToday || attendanceLocked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600'
                    }`}
                  onClick={() => markAttendance(selectedStudent!, 'Absent')}
                >
                  Absent
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!isToday || attendanceLocked}
                className={`mt-4 px-6 py-3 rounded text-white ${!isToday || attendanceLocked
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                  }`}
              >
                {attendanceLocked
                  ? 'Activity (Coming Soon)'
                  : !isToday
                    ? 'View Only'
                    : 'Submit Attendance'}
              </button>
              {attendanceLocked && isToday && (
                <p className="mt-3 text-red-600 font-semibold">
                  Attendance has been locked for the day.
                </p>
              )}
              {!isToday && (
                <p className="mt-3 text-gray-600 italic">
                  Past attendance is view-only.
                </p>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-xl">No students available</div>
          )}
        </div>

        <div className="md:w-3/10 bg-gray-300 p-4 overflow-auto">
          <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800">Student List</h2>
          <div className="flex flex-col space-y-3">
            {students.map((student) => {
              const status = attendanceRecords[student];
              let bgColorClass = 'bg-gray-400 hover:bg-gray-500';
              if (status === 'Present') bgColorClass = 'bg-green-500 hover:bg-green-600';
              else if (status === 'Absent') bgColorClass = 'bg-red-500 hover:bg-red-600';

              return (
                <div key={student} className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedStudent(student)}
                    className={`flex-1 rounded-md font-medium py-4 px-6 text-left transition text-white ${bgColorClass} ${selectedStudent === student ? 'ring-4 ring-blue-400' : ''}`}
                  >
                    {student}
                  </button>
                  {/* <button
                    onClick={() => handleDeleteStudent(student)}
                    disabled={attendanceLocked}
                    className="text-red-700 font-bold text-lg hover:text-red-900"
                  >
                    ✕
                  </button> */}
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </>
  );
}
