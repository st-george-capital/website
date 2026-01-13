'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Users } from 'lucide-react';
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
}

export default function EditCalendarEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    allDay: false,
    location: '',
    category: 'quant_trading',
    subcategory: '',
    priority: 'medium',
    status: 'scheduled',
    attendees: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/calendar/${eventId}`);
      if (response.ok) {
        const eventData = await response.json();
        setEvent(eventData);

        // Parse dates and populate form
        const startDate = new Date(eventData.startDate);
        const endDate = eventData.endDate ? new Date(eventData.endDate) : null;

        setFormData({
          title: eventData.title,
          description: eventData.description || '',
          startDate: startDate.toISOString().split('T')[0],
          startTime: eventData.allDay ? '' : startDate.toTimeString().slice(0, 5),
          endDate: endDate ? endDate.toISOString().split('T')[0] : '',
          endTime: endDate && !eventData.allDay ? endDate.toTimeString().slice(0, 5) : '',
          allDay: eventData.allDay,
          location: eventData.location || '',
          category: eventData.category,
          subcategory: eventData.subcategory || '',
          priority: eventData.priority,
          status: eventData.status,
          attendees: eventData.attendees || '',
        });
      } else {
        alert('Event not found');
        router.push('/dashboard/calendar');
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      alert('Failed to load event');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Combine date and time for start/end dates
      const startDateTime = formData.allDay
        ? new Date(formData.startDate)
        : new Date(`${formData.startDate}T${formData.startTime}`);

      const endDateTime = formData.allDay && formData.endDate
        ? new Date(formData.endDate)
        : !formData.allDay && formData.endDate && formData.endTime
        ? new Date(`${formData.endDate}T${formData.endTime}`)
        : null;

      const eventData = {
        title: formData.title,
        description: formData.description,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime?.toISOString(),
        allDay: formData.allDay,
        location: formData.location,
        category: formData.category,
        subcategory: formData.subcategory,
        priority: formData.priority,
        status: formData.status,
        attendees: formData.attendees,
      };

      const response = await fetch(`/api/calendar/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      if (response.ok) {
        router.push('/dashboard/calendar');
      } else {
        alert('Failed to update event');
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const getSubcategories = (category: string) => {
    switch (category) {
      case 'macro':
      case 'equity':
        return [
          { value: 'financials', label: 'Financials' },
          { value: 'consumer', label: 'Consumer' },
          { value: 'energy', label: 'Energy' },
          { value: 'healthcare', label: 'Healthcare' },
          { value: 'macro_technology', label: 'Macro Technology' },
        ];
      default:
        return [];
    }
  };

  if (fetchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/calendar" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 rounded-md transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Calendar
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Calendar Event</h1>
          <p className="text-muted-foreground">
            Update event details and settings
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Event Details</h3>

          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Event title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Event description and details"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border rounded-md"
              placeholder="Meeting room, virtual link, etc."
            />
          </div>
        </div>

        {/* Date & Time */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Date & Time</h3>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="allDay"
              name="allDay"
              checked={formData.allDay}
              onChange={handleCheckboxChange}
              className="rounded"
            />
            <label htmlFor="allDay" className="text-sm font-medium">
              All day event
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Start Date *</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
                required
              />
            </div>

            {!formData.allDay && (
              <div>
                <label className="block text-sm font-medium mb-2">Start Time *</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                  required
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">End Date</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>

            {!formData.allDay && formData.endDate && (
              <div>
                <label className="block text-sm font-medium mb-2">End Time</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                />
              </div>
            )}
          </div>
        </div>

        {/* Categorization */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Categorization</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => {
                  handleChange(e);
                  // Reset subcategory when category changes
                  setFormData(prev => ({ ...prev, subcategory: '' }));
                }}
                className="w-full px-3 py-2 border border-border rounded-md"
                required
              >
                <option value="quant_trading">Quant Trading</option>
                <option value="quant_research">Quant Research</option>
                <option value="macro">Macro</option>
                <option value="equity">Equity</option>
              </select>
            </div>

            {(formData.category === 'macro' || formData.category === 'equity') && (
              <div>
                <label className="block text-sm font-medium mb-2">Subcategory</label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border rounded-md"
                >
                  <option value="">Select subcategory</option>
                  {getSubcategories(formData.category).map((sub) => (
                    <option key={sub.value} value={sub.value}>
                      {sub.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Attendees */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Attendees</h3>

          <div>
            <label className="block text-sm font-medium mb-2">
              Tag Team Members
            </label>
            <div className="flex items-center gap-2 p-3 border border-border rounded-md bg-muted/50">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                User tagging will be implemented in a future update
              </span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-6">
          <Button type="submit" disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Updating...' : 'Update Event'}
          </Button>

          <Link href="/dashboard/calendar" className="inline-flex items-center px-4 py-2 border border-border rounded-md text-sm hover:bg-accent transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
