'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Hero } from '@/components/hero';
import { Section } from '@/components/section';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/card';
import { Button } from '@/components/button';
import { Badge } from '@/components/ui/badge';
import { Mail, MapPin, Linkedin, Instagram, Send, Briefcase, Users, TrendingUp, Target } from 'lucide-react';
interface JobPosting {
  id: string;
  title: string;
  description: string;
  team: 'quant_trading' | 'quant_research' | 'macro' | 'equity';
  endDate: string;
  published: boolean;
}



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

      {/* Join Our Team Section */}
      <Section dark>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-serif text-4xl font-bold mb-6">Join Our Team</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We're always looking for talented individuals to join our quantitative trading and fundamental research teams.
              Explore our current opportunities below.
            </p>
          </div>

          {/* Job Postings - Moved to top */}
          <JobPostingsSection />


          {/* Team Sections */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Quant Trading</h3>
              <p className="text-muted-foreground mb-4">
                Develop and implement algorithmic trading strategies across multiple asset classes.
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• High-frequency trading</div>
                <div>• Risk management systems</div>
                <div>• Portfolio optimization</div>
                <div>• Execution algorithms</div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Quant Research</h3>
              <p className="text-muted-foreground mb-4">
                Conduct fundamental research and develop quantitative models for investment decisions.
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Statistical modeling</div>
                <div>• Machine learning</div>
                <div>• Factor analysis</div>
                <div>• Backtesting frameworks</div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Macro Research</h3>
              <p className="text-muted-foreground mb-4">
                Analyze macroeconomic trends and their impact on global markets and asset allocation.
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Economic forecasting</div>
                <div>• Policy analysis</div>
                <div>• Currency markets</div>
                <div>• Global trade dynamics</div>
              </div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="font-serif text-xl font-bold mb-3">Equity Research</h3>
              <p className="text-muted-foreground mb-4">
                Perform in-depth fundamental analysis of individual companies and sectors.
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>• Company analysis</div>
                <div>• Sector research</div>
                <div>• Valuation modeling</div>
                <div>• Investment theses</div>
              </div>
            </div>
          </div>

          {/* Job Postings */}
        </div>
      </Section>
    </>
  );
}

function JobPostingsSection() {
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobPostings();
  }, []);

  const fetchJobPostings = async () => {
    try {
      const response = await fetch('/api/job-postings/public');
      if (response.ok) {
        const data = await response.json();
        setJobPostings(data);
      }
    } catch (error) {
      console.error('Error fetching job postings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-serif text-2xl font-bold text-center mb-8">Open Positions</h3>

      {jobPostings.length === 0 ? (
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-xl font-medium mb-2">No Open Positions</h4>
          <p className="text-muted-foreground">
            Check back soon for new opportunities, or send us your resume for future consideration.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {jobPostings.map((posting) => (
            <JobPostingCard key={posting.id} posting={posting} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobPostingCard({ posting }: { posting: JobPosting }) {
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  const teamColors = {
    quant_trading: 'bg-blue-100 text-blue-700 border-blue-200',
    quant_research: 'bg-green-100 text-green-700 border-green-200',
    macro: 'bg-purple-100 text-purple-700 border-purple-200',
    equity: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <Badge className={`${teamColors[posting.team as keyof typeof teamColors] || 'bg-gray-100 text-gray-700 border-gray-200'} border`}>
              {posting.team.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Due: {new Date(posting.endDate).toLocaleDateString()}
            </span>
          </div>
          <CardTitle className="text-lg">{posting.title}</CardTitle>
          <CardDescription className="line-clamp-3">
            {posting.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setShowApplicationForm(true)}
            className="w-full"
          >
            Apply Now
          </Button>
        </CardContent>
      </Card>

      {showApplicationForm && (
        <ApplicationModal
          posting={posting}
          onClose={() => setShowApplicationForm(false)}
        />
      )}
    </>
  );
}

function ApplicationModal({ posting, onClose }: { posting: JobPosting; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    resumeFile: '',
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({ ...prev, resumeFile: data.url }));
      } else {
        alert('Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      alert('Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }
      handleFileUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/job-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPostingId: posting.id,
          ...formData,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Application Submitted!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-muted-foreground mb-6">
              Thank you for your interest in joining St. George Capital. We'll review your application and get back to you soon.
            </p>
            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Apply for {posting.title}</CardTitle>
          <CardDescription>
            {posting.team.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Resume/CV *</label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <div className="text-center">
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="text-sm text-muted-foreground">
                        {uploading ? 'Uploading...' : 'Click to upload your resume'}
                      </span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={uploading}
                        required={!formData.resumeFile}
                      />
                    </label>
                    {formData.resumeFile && (
                      <p className="text-sm text-green-600">Resume uploaded successfully</p>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, DOC, DOCX (max 10MB)
              </p>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !formData.resumeFile}
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
