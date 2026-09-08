"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Briefcase, FileText, Instagram, Linkedin } from "lucide-react";
interface JobPosting {
  id: string;
  title: string;
  description: string;
  team: string;
  roleTag?: string | null;
  requirements?: string | null;
  endDate: string;
  published: boolean;
  documentFile?: string;
}

function formatTeamLabel(team: string) {
  if (team === "macro_equity") return "Macro & Equity";
  if (team === "executive") return "Executive Team";
  return team
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          subject: "",
          message: "",
        });
      } else {
        setSubmitStatus("error");
      }
    } catch (error) {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitStatus("idle"), 5000);
    }
  };

  return (
    <div className="join-page">
      <header className="join-intro">
        <div className="join-copy">
          <p className="eyebrow">Opportunities / St. George Capital</p>
          <h1>
            Join Us<span>.</span>
          </h1>
          <p className="join-lead">
            A shared interest in markets.
            <br />
            Room to do something with it.
          </p>
          <p>
            Learn from our experienced leadership team and work alongside
            like-minded peers. We're always looking for talented individuals to
            join our quantitative trading and fundamental research teams.
          </p>
          <a href="#opportunities" className="join-primary">
            Explore opportunities <span aria-hidden="true">↗</span>
          </a>
        </div>
        <figure className="join-photo">
          <Image
            src="/images/webphotos/joinus.jpg"
            alt="St. George Capital members learning and working together"
            fill
            sizes="(min-width: 768px) 45vw, 100vw"
            className="object-cover"
            priority
          />
          <figcaption>Mentorship. Collaboration. Practice.</figcaption>
        </figure>
      </header>
      <section id="opportunities" className="join-opportunities">
        <div className="join-section-heading">
          <div>
            <p className="eyebrow">Find your team</p>
            <h2>Current Opportunities</h2>
          </div>
          <p>
            Explore our open positions and the work you could contribute to.
          </p>
        </div>
        <JobPostingsSection />
      </section>
      <section
        className="join-stay-connected"
        aria-label="More ways to connect"
      >
        <details>
          <summary>
            <div>
              <span className="eyebrow">For future opportunities</span>
              <h2>Resume Book</h2>
              <p>Share your resume with our leadership team.</p>
            </div>
            <span className="details-plus" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="join-expanded">
            <ResumeBookSection />
          </div>
        </details>
        <details>
          <summary>
            <div>
              <span className="eyebrow">Follow our research</span>
              <h2>Daily Market Snapshot</h2>
              <p>Get SGC's market briefing in your inbox.</p>
            </div>
            <span className="details-plus" aria-hidden="true">
              +
            </span>
          </summary>
          <div className="join-expanded">
            <NewsletterSubscribeSection />
          </div>
        </details>
      </section>
      <section className="join-contact" id="get-in-touch">
        <div className="join-contact-intro">
          <p className="eyebrow">Start a conversation</p>
          <h2>Get in touch.</h2>
          <p>
            Questions about joining, partnerships, or our research? Send us a
            message.
          </p>
          <a href="mailto:outreach@stgeorgecapital.ca">
            outreach@stgeorgecapital.ca ↗
          </a>
          <div className="join-social">
            <a
              href="https://www.linkedin.com/company/101142532"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Linkedin size={18} aria-hidden="true" /> LinkedIn ↗
            </a>
            <a
              href="https://www.instagram.com/st_george_capital"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={18} aria-hidden="true" /> Instagram ↗
            </a>
          </div>
        </div>
        <div className="join-contact-form">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium mb-2"
                >
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
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium mb-2"
                >
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
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium mb-2"
              >
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-2"
              >
                Message
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                required
                rows={6}
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={isSubmitting}
            >
              <Send className="mr-2 h-5 w-5" />
              Send Message
            </Button>

            {submitStatus === "success" && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                Thank you for your message! We'll get back to you as soon as
                possible.
              </div>
            )}

            {submitStatus === "error" && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                Something went wrong. Please try again or email us directly.
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
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
      const response = await fetch("/api/job-postings/public", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setJobPostings(data);
      }
    } catch (error) {
      console.error("Error fetching job postings:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      ) : jobPostings.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
          <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-xl font-medium mb-2">No Open Positions</h4>
          <p className="text-muted-foreground mb-4">
            We don't have any open positions at the moment.
          </p>
          <p className="text-sm text-white/80">
            Check back soon for new opportunities, or send us your resume at{" "}
            <a
              href="mailto:outreach@stgeorgecapital.ca"
              className="text-blue-400 hover:text-blue-300 hover:underline"
            >
              outreach@stgeorgecapital.ca
            </a>{" "}
            for future consideration.
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

  const teamColors: Record<string, string> = {
    quant_trading: "bg-blue-100 text-blue-700 border-blue-200",
    quant_research: "bg-green-100 text-green-700 border-green-200",
    macro: "bg-purple-100 text-purple-700 border-purple-200",
    equity: "bg-orange-100 text-orange-700 border-orange-200",
    macro_equity: "bg-purple-100 text-purple-700 border-purple-200",
    operations: "bg-slate-100 text-slate-700 border-slate-200",
    executive: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-wrap gap-2">
              {posting.roleTag && (
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 border">
                  {posting.roleTag}
                </Badge>
              )}
              <Badge
                className={`${teamColors[posting.team as keyof typeof teamColors] || "bg-gray-100 text-gray-700 border-gray-200"} border`}
              >
                {formatTeamLabel(posting.team)}
              </Badge>
            </div>
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
          <div className="space-y-3">
            {posting.documentFile && (
              <a
                href={posting.documentFile}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Job Description PDF
              </a>
            )}
            <Button
              onClick={() => setShowApplicationForm(true)}
              className="w-full"
            >
              Apply Now
            </Button>
          </div>
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

function ApplicationModal({
  posting,
  onClose,
}: {
  posting: JobPosting;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    faculty: "",
    subfaculty: "",
    internshipCount: "0",
    internshipFields: [] as string[],
    resumeFile: "",
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const selectedFaculty = FACULTY_OPTIONS.find(
    (f) => f.value === formData.faculty,
  );

  const toggleInternshipField = (val: string) => {
    setFormData((prev) => ({
      ...prev,
      internshipFields: prev.internshipFields.includes(val)
        ? prev.internshipFields.filter((f) => f !== val)
        : [...prev.internshipFields, val],
    }));
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await response.json();
      if (response.ok) {
        setFormData((prev) => ({ ...prev, resumeFile: data.url }));
      } else {
        alert(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error uploading resume:", error);
      alert(
        "Upload failed: could not reach the server. Check your internet connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        alert(
          `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please keep your resume under 4MB — try exporting as PDF with reduced image quality, or use a PDF compressor like smallpdf.com.`,
        );
        return;
      }
      handleFileUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/job-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPostingId: posting.id,
          ...formData,
          internshipCount: Number(formData.internshipCount),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to submit application");
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">
              Application Submitted!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-muted-foreground mb-6">
              Thank you for your interest in joining St. George Capital. We'll
              review your application and get back to you soon.
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
            {posting.roleTag ? `${posting.roleTag} · ` : ""}
            {formatTeamLabel(posting.team)} Team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-5">
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                Role Description
              </h4>
              <p className="text-sm text-foreground/90 leading-6">
                {posting.description}
              </p>
            </div>
            {posting.requirements && (
              <div>
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-2">
                  Requirements
                </h4>
                <p className="text-sm text-foreground/80 leading-6 whitespace-pre-line">
                  {posting.requirements}
                </p>
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Resume/CV *
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-4">
                <div className="text-center">
                  <div className="space-y-2">
                    <label className="cursor-pointer">
                      <span className="text-sm text-muted-foreground">
                        {uploading
                          ? "Uploading..."
                          : "Click to upload your resume"}
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
                      <p className="text-sm text-green-600">
                        Resume uploaded successfully
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, DOC, DOCX (max 2MB)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Faculty *
                </label>
                <select
                  required
                  value={formData.faculty}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      faculty: e.target.value,
                      subfaculty: "",
                    }))
                  }
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select faculty...</option>
                  {FACULTY_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFaculty && selectedFaculty.subs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Program *
                  </label>
                  <select
                    required
                    value={formData.subfaculty}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        subfaculty: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select program...</option>
                    {selectedFaculty.subs.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Number of Previous Internships
              </label>
              <select
                value={formData.internshipCount}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    internshipCount: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {["0", "1", "2", "3", "4", "5"].map((n) => (
                  <option key={n} value={n}>
                    {n === "5" ? "5 or more" : n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Field(s) of Internship (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERNSHIP_FIELDS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => toggleInternshipField(f.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      formData.internshipFields.includes(f.value)
                        ? "bg-blue-100 border-blue-300 text-blue-700"
                        : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 text-gray-900 border-gray-400"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !formData.resumeFile}
              >
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Resume Book Section ───────────────────────────────────────────────
const FACULTY_OPTIONS = [
  {
    value: "engineering",
    label: "Engineering",
    subs: [
      { value: "electrical_engineering", label: "Electrical Engineering" },
      { value: "mechanical_engineering", label: "Mechanical Engineering" },
      { value: "industrial_engineering", label: "Industrial Engineering" },
      { value: "engineering_science", label: "Engineering Science" },
      { value: "chemical_engineering", label: "Chemical Engineering" },
      { value: "materials_engineering", label: "Materials Engineering" },
      { value: "civil_engineering", label: "Civil Engineering" },
    ],
  },
  {
    value: "arts_science",
    label: "Arts & Science",
    subs: [
      { value: "economics", label: "Economics" },
      { value: "philosophy", label: "Philosophy" },
      { value: "marketing", label: "Marketing" },
      { value: "mathematics", label: "Mathematics" },
      { value: "computer_science", label: "Computer Science" },
    ],
  },
  {
    value: "rotman",
    label: "Rotman Commerce",
    subs: [],
  },
];

const INTERNSHIP_FIELDS = [
  { value: "finance", label: "Finance" },
  { value: "tech", label: "Technology" },
  { value: "research", label: "Research" },
  { value: "other", label: "Other" },
];

function ResumeBookSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    faculty: "",
    subfaculty: "",
    internshipCount: "0",
    internshipFields: [] as string[],
    resumeFile: "",
  });

  const selectedFaculty = FACULTY_OPTIONS.find((f) => f.value === form.faculty);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      alert(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please keep your resume under 4MB — try exporting as PDF with reduced image quality, or use a PDF compressor like smallpdf.com.`,
      );
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setForm((prev) => ({ ...prev, resumeFile: data.url }));
      } else {
        alert(`Upload failed: ${data.error || "Unknown error"}`);
      }
    } catch {
      alert(
        "Upload failed: could not reach the server. Check your internet connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const toggleField = (val: string) => {
    setForm((prev) => ({
      ...prev,
      internshipFields: prev.internshipFields.includes(val)
        ? prev.internshipFields.filter((f) => f !== val)
        : [...prev.internshipFields, val],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.resumeFile) {
      alert("Please upload your resume PDF first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/resume-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          internshipCount: Number(form.internshipCount),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json();
        alert(err.error || "Submission failed.");
      }
    } catch {
      alert("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-10 bg-white/5 border border-white/10 rounded-2xl px-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-green-400" />
        </div>
        <h4 className="text-xl font-semibold text-white mb-2">
          Resume Submitted!
        </h4>
        <p className="text-white/70">
          Thank you, {form.name}. We&apos;ll keep your resume on file for future
          opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/40 focus:outline-none focus:border-white/50"
                  placeholder="jane@mail.utoronto.ca"
                />
              </div>
            </div>

            {/* Faculty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1">
                  Faculty *
                </label>
                <select
                  required
                  value={form.faculty}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      faculty: e.target.value,
                      subfaculty: "",
                    }))
                  }
                  className="w-full px-3 py-2 bg-[#030116] border border-white/20 rounded-md text-white focus:outline-none focus:border-white/50"
                >
                  <option value="">Select faculty…</option>
                  {FACULTY_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
              {selectedFaculty && selectedFaculty.subs.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">
                    Program *
                  </label>
                  <select
                    required
                    value={form.subfaculty}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, subfaculty: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-[#030116] border border-white/20 rounded-md text-white focus:outline-none focus:border-white/50"
                  >
                    <option value="">Select program…</option>
                    {selectedFaculty.subs.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Internship count */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Number of Previous Internships
              </label>
              <select
                value={form.internshipCount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, internshipCount: e.target.value }))
                }
                className="w-full px-3 py-2 bg-[#030116] border border-white/20 rounded-md text-white focus:outline-none focus:border-white/50"
              >
                {["0", "1", "2", "3", "4", "5"].map((n) => (
                  <option key={n} value={n}>
                    {n === "5" ? "5 or more" : n}
                  </option>
                ))}
              </select>
            </div>

            {/* Internship fields */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Field(s) of Internship (select all that apply)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERNSHIP_FIELDS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => toggleField(f.value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      form.internshipFields.includes(f.value)
                        ? "bg-blue-500 border-blue-400 text-white"
                        : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume upload */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1">
                Resume PDF *
              </label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-5 text-center">
                {form.resumeFile ? (
                  <div className="space-y-2">
                    <p className="text-green-400 text-sm font-medium">
                      ✓ Resume uploaded
                    </p>
                    <a
                      href={form.resumeFile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline"
                    >
                      View uploaded file
                    </a>
                    <div>
                      <label className="cursor-pointer text-xs text-white/50 hover:text-white/70">
                        Replace file
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <FileText className="w-10 h-10 text-white/30 mx-auto mb-2" />
                    <p className="text-sm text-white/60">
                      {uploading
                        ? "Uploading…"
                        : "Click to upload your resume (PDF, max 2MB)"}
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || uploading}
            >
              {submitting ? "Submitting…" : "Submit Resume"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function NewsletterSubscribeSection() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");

    const res = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    });
    const data = await res.json();

    if (res.ok) {
      setStatus("success");
      setMessage(data.message || "You're subscribed!");
    } else {
      setStatus("error");
      setMessage(data.error || "Something went wrong.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-blue-400" />
        </div>
        <h3 className="font-serif text-2xl font-bold mb-2">
          Daily Market Snapshot
        </h3>
        <p className="text-white/60 text-sm max-w-md mx-auto mb-6">
          Get SGC&apos;s daily briefing — key macro developments, cross-asset
          moves, earnings, and central bank signals — delivered straight to your
          inbox.
        </p>

        {status === "success" ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-6 py-4">
            <p className="text-green-400 font-medium">✓ {message}</p>
            <p className="text-sm text-white/50 mt-1">
              You&apos;ll receive the next edition when it&apos;s published.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name (optional)"
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {status === "loading"
                ? "Subscribing…"
                : "Subscribe to Daily Snapshot"}
            </button>
            {status === "error" && (
              <p className="text-red-400 text-xs">{message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
