'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section } from '@/components/section';
import { Card, CardHeader } from '@/components/card';
import { Button } from '@/components/button';
import { Mail, MapPin, Linkedin, Instagram, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: '',
        });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }
  };

  return (
    <>
      <Hero
        title="Get In Touch"
        subtitle="Have questions? Want to join our team? We'd love to hear from you."
        height="medium"
      />

      <Section>
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-serif text-3xl font-bold mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData({ ...formData, firstName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData({ ...formData, lastName: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={6}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                <Send className="mr-2 h-5 w-5" />
                Send Message
              </Button>

              {submitStatus === 'success' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                  Thank you for your message! We'll get back to you as soon as possible.
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  Something went wrong. Please try again or email us directly.
                </div>
              )}
            </form>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="h-full">
              <CardHeader>
                <h2 className="font-serif text-3xl font-bold mb-6">Contact Information</h2>

                <div className="space-y-8">
                  {/* Email */}
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Mail className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif font-semibold">Email</h3>
                        <p className="text-sm">Best way to reach us</p>
                      </div>
                    </div>
                    <a
                      href="mailto:outreach@stgeorgecapital.ca"
                      className="text-primary hover:underline text-lg"
                    >
                      outreach@stgeorgecapital.ca
                    </a>
                  </div>

                  {/* Address */}
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif font-semibold">Address</h3>
                        <p className="text-sm">Our location</p>
                      </div>
                    </div>
                    <p>
                      Bahen Centre for Information Technology
                      <br />
                      40 St George St
                      <br />
                      Toronto, ON M5S 2E4
                    </p>
                  </div>

                  {/* Social Media */}
                  <div>
                    <h3 className="font-serif font-semibold mb-4">Connect With Us</h3>
                    <div className="flex space-x-4">
                      <a
                        href="https://www.linkedin.com/company/101142532"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-border hover:border-primary hover:bg-primary/10 transition-all"
                        aria-label="LinkedIn"
                      >
                        <Linkedin className="w-5 h-5" />
                      </a>
                      <a
                        href="https://www.instagram.com/st_george_capital"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-border hover:border-primary hover:bg-primary/10 transition-all"
                        aria-label="Instagram"
                      >
                        <Instagram className="w-5 h-5" />
                      </a>
                    </div>
                  </div>

                  {/* Office Hours */}
                  <div className="pt-6 border-t border-border">
                    <h3 className="font-serif font-semibold mb-3">Office Hours</h3>
                    <p className="mb-2">
                      We typically respond within 24-48 hours during the academic year.
                    </p>
                    <p className="text-sm">
                      For urgent matters, please indicate so in your message subject line.
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        </div>
      </Section>

      {/* Map Section */}
      <Section dark>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-4xl font-bold mb-6">Visit Us</h2>
          <p className="text-xl mb-8">
            We're located at the Bahen Centre at the University of Toronto's St. George campus. Stop by during our office hours or attend one of our events.
          </p>
          <div className="aspect-video rounded-lg overflow-hidden border border-white/10">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2886.234!2d-79.39768!3d43.65954!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x882b34c8a4c5e5c5%3A0x5a5f5a5f5a5f5a5f!2sBahen%20Centre%20for%20Information%20Technology!5e0!3m2!1sen!2sca!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </Section>
    </>
  );
}

