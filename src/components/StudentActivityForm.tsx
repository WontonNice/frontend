import React, { useState, useEffect } from 'react';

interface Props {
  studentName: string;
  initialActivities?: Record<string, string>;
  editable?: boolean;
  onSave?: () => void;
}

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

const StudentActivityForm: React.FC<Props> = ({
  studentName,
  initialActivities = {},
  editable = true,
  onSave,
}) => {
  const [activities, setActivities] = useState<Record<string, string>>(initialActivities);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  const handleChange = (day: string, value: string) => {
    setActivities((prev) => ({ ...prev, [day]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `https://attendance-app-backend-ze6p.onrender.com/api/students/${encodeURIComponent(
          studentName
        )}/activities`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(activities),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save activities: ${response.statusText}`);
      }

      setSuccessMessage('Saved successfully!');
      setTimeout(() => setSuccessMessage(''), 2000);
      if (onSave) onSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 border border-gray-200 rounded-2xl shadow-md bg-pink-50 mb-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <h3 className="font-semibold text-sm md:text-base text-sky-800 mb-2 md:mb-0 drop-shadow-sm truncate">
          {studentName}
        </h3>
        {editable && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-sky-500 text-white px-4 py-2 rounded-full hover:bg-sky-600 disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-cols-5 gap-2 w-full min-w-[350px]">
          {weekdays.map((day) => (
            <div key={day} className="flex flex-col min-w-0">
              <label className="block text-xs font-medium text-sky-700 mb-1">
                {day} 🗓️
              </label>
              <input
                type="text"
                className={`w-full px-2 py-1 border rounded-md text-xs bg-white text-black placeholder-gray-400 shadow-sm transition-all ${
                  editable
                    ? 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400'
                    : 'bg-gray-100 cursor-not-allowed'
                }`}
                value={activities[day] || ''}
                onChange={(e) => handleChange(day, e.target.value)}
                placeholder="Activity"
                readOnly={!editable}
              />
            </div>
          ))}
        </div>
      </div>

      {successMessage && (
        <p className="text-green-600 mt-3 text-sm font-medium">{successMessage}</p>
      )}
    </div>
  );
};

export default StudentActivityForm;
