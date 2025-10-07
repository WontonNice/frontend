import { useState, useEffect } from 'react';
import '../App.css';

type AttendanceStatus = 'Present' | 'Absent';
type AttendanceRecords = Record<string, AttendanceStatus>;
type Student = { name: string; status?: AttendanceStatus };
type DateOption = string;

export default function AdminDashboard({ teacherId, isAdmin, teacherName, classDisplayName }: { teacherId: number, isAdmin: boolean, teacherName: string, classDisplayName: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecords>({});
  const [classes, setClasses] = useState<{ id: number; name: string; class_display_name?: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateOption>(new Date().toISOString().split('T')[0]);
  const [newClassName, setNewClassName] = useState('');
  const [newClassPassword, setNewClassPassword] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [renamingClassName, setRenamingClassName] = useState('');
  const [attendanceLocked, setAttendanceLocked] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  //const [canEditActivities, setCanEditActivities] = useState(false);

  const isReadOnlyAdmin = teacherName.toLowerCase() === 'susan';

  const getTeacherDisplayName = (classDisplayName: string) => {
  const match = classDisplayName.match(/\((.*?)\)/);
  return match ? match[1] : '';
};

const teacherDisplayName = getTeacherDisplayName(classDisplayName);
  
{selectedClassId && (
  <div className="text-center py-4 text-xl font-semibold text-gray-800">
    Welcome, {teacherDisplayName || teacherName}!
  </div>
)}

  const fetchLockStatus = async () => {
    try {
      const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/attendance/lock-status');
      const data = await res.json();
      setAttendanceLocked(data.locked);
    } catch (err) {
      console.error('Failed to fetch lock status');
    }
  };
  const handleCreateClass = async () => {
    try {
      const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/teacher/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClassName, password: newClassPassword, role: 'teacher' }),
      });
      if (!res.ok) throw new Error('Failed to create teacher');
      setNewClassName('');
      setNewClassPassword('');
      fetchClasses();
    } catch (err) {
      alert('Failed to create class');
    }
  };

  const handleAddStudent = async () => {
    try {
      const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStudentName, teacherId: selectedClassId }),
      });
      if (!res.ok) throw new Error('Failed to add student');
      setNewStudentName('');
      fetchStudents(selectedClassId!);
    } catch (err) {
      alert('Failed to add student');
    }
  };

  const fetchStudents = async (classId: number, date: string = selectedDate) => {
    const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students?teacherId=${classId}&date=${date}`);
    const data = await res.json();
    setStudents(data);
    if (data.length > 0) setSelectedStudent(data[0].name);
    setSelectedClassId(classId);

    const selected = classes.find((cls) => cls.id === classId);
    if (selected) setRenamingClassName(selected.class_display_name || selected.name);
  };

  const fetchClasses = async () => {
    const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/teacher/teachers');
    const data = await res.json();
    setClasses(data);
  };


  const [copied, setCopied] = useState(false);

  const copyClassAttendanceStatus = async (classId: number) => {
    try {
      const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students?teacherId=${classId}&date=${selectedDate}`);
      const data = await res.json();

      const sorted = data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      const output = sorted.map((s: any) => s.status === 'Present' ? 'TRUE' : 'FALSE').join('\n');

      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2s
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Copy failed.');
    }
  };

  const markAttendance = async (studentName: string, status: AttendanceStatus) => {
    try {
      await fetch('https://attendance-app-backend-ze6p.onrender.com/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedClassId,
          studentName,
          status,
          date: selectedDate
        }),
      });

      setAttendanceRecords((prev) => ({
        ...prev,
        [studentName]: status,
      }));

      const currentIndex = students.findIndex((s) => s.name === studentName);
      const nextIndex = (currentIndex + 1) % students.length;
      setSelectedStudent(students[nextIndex]?.name);
    } catch (err) {
      console.error('Error submitting attendance:', err);
      alert('Failed to update attendance.');
    }
  };
  useEffect(() => {
    if (isAdmin) {
      fetchClasses();
      fetchLockStatus();
    } else {
      fetchStudents(teacherId, selectedDate);
    }
  }, [teacherId, isAdmin]);


  useEffect(() => {
    const map: AttendanceRecords = {};
    students.forEach(s => {
      if (s.status) map[s.name] = s.status;
    });
    setAttendanceRecords(map);
  }, [students]);
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId, selectedDate);
    }
  }, [selectedDate]);
return (
  <div className="h-screen flex flex-col overflow-hidden bg-gray-800 text-white">
      {isAdmin && !selectedClassId && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-8 overflow-y-auto">
            {classes.map((teacher) => (
              <div key={teacher.id} className="bg-blue-500 text-white p-6 rounded hover:bg-blue-600 flex flex-col gap-2">
                <button
                  onClick={() => fetchStudents(teacher.id)}
                  className="text-xl font-bold"
                >
                  {teacher.class_display_name || `${teacher.name}'s class`}
                </button>
                {!isReadOnlyAdmin && (
                  <button
                    onClick={() => copyClassAttendanceStatus(teacher.id)}
                    className="bg-white text-blue-600 font-semibold py-2 px-4 rounded hover:bg-gray-200"
                  >  {copied ? 'Copied!' : 'Copy Attendance Status'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new class */}
          {!isReadOnlyAdmin && (

<div className="p-4 border-t mt-4">
  <button
    onClick={() => setShowAddClass(prev => !prev)}
    className="flex items-center justify-between w-full text-lg font-semibold text-white mb-2 bg-gray-700 p-2 rounded"
  >
    <span>Add New Class</span>
    <svg
      className={`w-5 h-5 transform transition-transform ${showAddClass ? 'rotate-90' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  </button>

  {showAddClass && (
    <div className="mt-2">
      <input
        type="text"
        placeholder="Teacher Name"
        value={newClassName}
        onChange={(e) => setNewClassName(e.target.value)}
        className="p-2 border rounded w-full mb-2 text-white bg-gray-800"
      />
      <input
        type="text"
        placeholder="Password"
        value={newClassPassword}
        onChange={(e) => setNewClassPassword(e.target.value)}
        className="p-2 border rounded w-full mb-2 text-white bg-gray-800"
      />
      <button
        onClick={handleCreateClass}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Create Class
      </button>
    </div>
  )}
</div>
        )}

          {/* Change Admin Password */}
{!isReadOnlyAdmin && (
  <div className="p-4 border-t mt-6">
    <button
      onClick={() => setShowPasswordChange(prev => !prev)}
      className="flex items-center justify-between w-full text-lg font-semibold text-white mb-2 bg-gray-700 p-2 rounded"
    >
      <span>Change Admin Password</span>
      <svg
        className={`w-5 h-5 transform transition-transform ${showPasswordChange ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>

    {showPasswordChange && (
      <div className="mt-2">
        <input
          type="password"
          placeholder="New Password"
          value={newClassPassword}
          onChange={(e) => setNewClassPassword(e.target.value)}
          className="p-2 border rounded w-full mb-2 text-black"
        />
        <button
          onClick={async () => {
            try {
              const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/teacher/update-password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teacherId, newPassword: newClassPassword }),
              });
              if (!res.ok) throw new Error('Failed to update password');
              alert('Password updated successfully');
              setNewClassPassword('');
              setShowPasswordChange(false);
            } catch (err) {
              alert('Failed to update password');
            }
          }}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Change Password
        </button>
      </div>
    )}
  </div>
)}

          {!isReadOnlyAdmin && (
            <div className="p-4 border-t mt-6">
              <h3 className="text-lg font-semibold mb-2">Global Attendance Lock</h3>
              <p className="mb-2 text-gray-700">
                Locking attendance will prevent teachers from submitting or modifying attendance for any class.
              </p>
              <button
                onClick={async () => {
                  try {
                    const newLockState = !attendanceLocked;
                    const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/attendance/lock-status', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ locked: newLockState }),
                    });
                    if (!res.ok) throw new Error('Failed to update lock status');
                    setAttendanceLocked(newLockState);
                  } catch (err) {
                    alert('Failed to update lock status');
                  }
                }}
                className={`px-4 py-2 rounded font-semibold text-white ${attendanceLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                {attendanceLocked ? 'Unlock Attendance' : 'Lock Attendance'}
              </button>
            </div>
          )}
        </>
      )}

      {selectedClassId && (
        <div className="flex flex-col md:flex-row h-full overflow-y-auto">
          <div className="md:w-7/10 bg-gray-50 p-6 flex flex-col gap-6 overflow-y-auto">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setSelectedClassId(null);
                    setStudents([]);
                    setSelectedStudent(null);
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  ← Back to class list
                </button>
                {!isReadOnlyAdmin && (

                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-semibold mb-2">Add Student to This Class</h3>
                    <input
                      type="text"
                      placeholder="Student Name"
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      className="p-2 border rounded w-full mb-2 text-black"
                    />
                    <button
                      onClick={handleAddStudent}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                    >
                      Add Student
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border p-2 rounded text-gray-900 w-full"
                  />
                </div>

                {/* Rename Class */}
                {!isReadOnlyAdmin && (

                  <div className="mt-4 bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-semibold mb-2">Rename This Class</h3>
                    <input
                      type="text"
                      placeholder="New Class Name"
                      value={renamingClassName}
                      onChange={(e) => setRenamingClassName(e.target.value)}
                      className="p-2 border rounded w-full mb-2 text-black"
                    />
                    <button
                      onClick={async () => {
                        if (!renamingClassName.trim()) return alert('Class name cannot be empty');

                        try {
                          const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/teacher/update-name', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ teacherId: selectedClassId, newName: renamingClassName }),
                          });

                          if (!res.ok) throw new Error('Failed to rename class');

                          alert('Class name updated');
                          fetchClasses();
                        } catch (err) {
                          alert('Failed to update class name');
                        }
                      }}
                      className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
                    >
                      Update Class Name
                    </button>
                  </div>
                )}
                {/* Delete Class */}
                {!isReadOnlyAdmin && (

                  <div className="mt-6 bg-white p-4 rounded shadow border border-red-400">
                    <h3 className="text-lg font-semibold mb-2 text-red-600">Delete Class</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      This will permanently delete the class and all associated students and attendance records.
                    </p>
                    <button
                      onClick={async () => {
                        const confirmed = confirm('Are you sure you want to delete this class? This will remove all students and attendance records permanently.');
                        if (!confirmed) return;

                        try {
                          const res = await fetch('https://attendance-app-backend-ze6p.onrender.com/api/teacher/delete', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ teacherId: selectedClassId }),
                          });

                          if (!res.ok) throw new Error('Failed to delete class');

                          alert('Class deleted successfully');
                          setSelectedClassId(null);
                          setStudents([]);
                          setSelectedStudent(null);
                          fetchClasses();
                        } catch (err) {
                          console.error('Error deleting class:', err);
                          alert('Failed to delete class');
                        }
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Delete This Class
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Attendance UI */}
            {!isReadOnlyAdmin && (

              <div className="bg-white rounded-lg shadow-lg p-10 w-full max-w-md mx-auto text-center">
                <h2 className="text-3xl font-semibold mb-8 text-gray-800">{selectedStudent}</h2>
                <div className="flex gap-6 justify-center">
                  <button
                    className="flex-1 bg-green-500 text-white py-4 rounded-lg hover:bg-green-600"
                    onClick={() => selectedStudent && markAttendance(selectedStudent, 'Present')}
                  >
                    Present
                  </button>
                  <button
                    className="flex-1 bg-red-500 text-white py-4 rounded-lg hover:bg-red-600"
                    onClick={() => selectedStudent && markAttendance(selectedStudent, 'Absent')}
                  >
                    Absent
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="md:w-3/10 bg-gray-300 p-4 overflow-auto">
            <h2 className="text-2xl font-semibold mb-4 text-center text-gray-800">Student List</h2>
            <div className="flex flex-col space-y-3">
              {students.map((student) => {
                const status = attendanceRecords[student.name];
                let bgColorClass = 'bg-gray-400 hover:bg-gray-500';
                if (status === 'Present') bgColorClass = 'bg-green-500 hover:bg-green-600';
                else if (status === 'Absent') bgColorClass = 'bg-red-500 hover:bg-red-600';

                return (
                  <div key={student.name} className="flex justify-between items-center space-x-2">
                    <button
                      onClick={() => setSelectedStudent(student.name)}
                      className={`flex-1 rounded-md font-medium py-4 px-6 text-left transition text-white ${bgColorClass} ${selectedStudent === student.name ? 'ring-4 ring-blue-400' : ''}`}
                    >
                      {student.name}
                    </button>
                    {!isReadOnlyAdmin && (

                      <button
                        onClick={async () => {
                          if (!confirm(`Are you sure you want to delete ${student.name}?`)) return;
                          try {
                            const res = await fetch(`https://attendance-app-backend-ze6p.onrender.com/api/students/delete`, {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ name: student.name, teacherId: selectedClassId }),
                            });
                            if (!res.ok) throw new Error('Delete failed');
                            fetchStudents(selectedClassId!);
                          } catch (err) {
                            alert('Failed to delete student');
                          }
                        }}
                        className="text-red-700 font-bold text-lg hover:text-red-900"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
