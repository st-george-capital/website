'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  Users,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  PlayCircle,
} from 'lucide-react';
import { Button } from '@/components/button';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  location?: string;
  category: 'quant_trading' | 'quant_research' | 'macro' | 'equity';
  subcategory?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  attendees?: string;
  createdBy: string;
}

const categoryColors = {
  quant_trading: 'bg-blue-500',
  quant_research: 'bg-green-500',
  macro: 'bg-purple-500',
  equity: 'bg-orange-500',
};

const priorityColors = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

const statusIcons = {
  scheduled: Clock,
  in_progress: PlayCircle,
  completed: CheckCircle,
  cancelled: XCircle,
};

export default function CalendarDashboardPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'quant_trading' | 'quant_research' | 'macro' | 'equity'>('all');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const isEditor = session?.user?.role === 'admin' || session?.user?.role === 'editor';

  useEffect(() => {
    fetchEvents();
  }, [currentDate, selectedCategory]);

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const params = new URLSearchParams({
        start: startOfMonth.toISOString(),
        end: endOfMonth.toISOString(),
      });

      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await fetch(`/api/calendar?${params}`);
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEvents();
        setShowEventModal(false);
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const days = getDaysInMonth(currentDate);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="text-muted-foreground">
            Manage team events, deadlines, and schedules
          </p>
        </div>
        {isEditor && (
          <Button asChild>
            <Link href="/dashboard/calendar/new">
              <Plus className="w-4 h-4 mr-2" />
              New Event
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md text-sm"
          >
            <option value="all">All Categories</option>
            <option value="quant_trading">Quant Trading</option>
            <option value="quant_research">Quant Research</option>
            <option value="macro">Macro</option>
            <option value="equity">Equity</option>
          </select>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              ‹
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              ›
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-4 text-center font-medium text-muted-foreground border-b border-border">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {days.map((date, index) => (
            <div key={index} className="min-h-[120px] p-2 border-r border-b border-border">
              {date && (
                <>
                  <div className="text-sm font-medium mb-2">{date.getDate()}</div>
                  <div className="space-y-1">
                    {getEventsForDate(date).slice(0, 3).map((event) => {
                      const StatusIcon = statusIcons[event.status];
                      return (
                        <div
                          key={event.id}
                          onClick={() => handleEventClick(event)}
                          className={`text-xs p-1 rounded cursor-pointer ${categoryColors[event.category]} text-white truncate hover:opacity-80`}
                        >
                          <div className="flex items-center gap-1">
                            <StatusIcon className="w-3 h-3" />
                            <span>{event.title}</span>
                          </div>
                        </div>
                      );
                    })}
                    {getEventsForDate(date).length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{getEventsForDate(date).length - 3} more
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${categoryColors[selectedEvent.category]}`}></div>
                  <span className="text-sm font-medium capitalize">
                    {selectedEvent.category.replace('_', ' ')}
                    {selectedEvent.subcategory && ` • ${selectedEvent.subcategory.replace('_', ' ')}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    {new Date(selectedEvent.startDate).toLocaleDateString()}
                    {!selectedEvent.allDay && ` at ${formatTime(selectedEvent.startDate)}`}
                    {selectedEvent.endDate && ` - ${formatTime(selectedEvent.endDate)}`}
                  </span>
                </div>

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}

                {selectedEvent.description && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">{selectedEvent.description}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <AlertCircle className={`w-4 h-4 ${priorityColors[selectedEvent.priority]}`} />
                  <span className="text-sm capitalize">{selectedEvent.priority} Priority</span>
                </div>

                {selectedEvent.attendees && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{selectedEvent.attendees.split(',').length} attendees</span>
                  </div>
                )}
              </div>

              {isEditor && (
                <div className="flex gap-2 mt-6 pt-4 border-t border-border">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/calendar/${selectedEvent.id}/edit`}>
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteEvent(selectedEvent.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
