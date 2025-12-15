import Calendar from '../Calendar';

export const CalendarPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Your Court</h1>
          <p className="mt-2 text-gray-600">
            Select a court, date, and time slot to make your reservation
          </p>
        </div>
        <Calendar />
      </div>
    </div>
  );
};
