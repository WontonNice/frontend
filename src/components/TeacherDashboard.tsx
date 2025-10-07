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
    <div
      className="p-4 border border-gray-300 rounded-lg shadow mb-6 w-full"
      style={{ backgroundColor: '#ffffff', color: '#000000' }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
        <h3 className="font-semibold text-lg mb-2 md:mb-0">{studentName}</h3>
        {editable && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {weekdays.map((day) => (
          <div key={day} className="flex flex-col">
            <label className="block text-sm mb-1" style={{ color: '#000000' }}>
              {day}
            </label>
            <input
              type="text"
              value={activities[day] || ''}
              onChange={(e) => handleChange(day, e.target.value)}
              placeholder="Activity"
              readOnly={!editable}
              style={{
                color: '#000000',
                backgroundColor: editable ? '#ffffff' : '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                padding: '0.5rem',
                fontSize: '0.875rem',
                cursor: editable ? 'text' : 'not-allowed',
              }}
            />
          </div>
        ))}
      </div>

      {successMessage && (
        <p className="mt-2 text-sm" style={{ color: 'green' }}>
          {successMessage}
        </p>
      )}
    </div>
  );
};

export default StudentActivityForm;
