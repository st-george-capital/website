import { Section, SectionHeader } from '@/components/section';
import { Card, CardContent } from '@/components/card';

export default function PrivacyPolicyPage() {
  return (
    <>
      <Section className="pt-32 pb-16" dark>
        <div className="max-w-4xl">
          <SectionHeader
            title="Privacy Policy"
            subtitle="How we collect, use, and protect your personal information"
          />
        </div>
      </Section>

      <Section>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="prose prose-lg max-w-none p-8">
              <p className="text-sm text-muted-foreground mb-8">
                <strong>Last Updated:</strong> January 12, 2025
              </p>

              <h2>1. Introduction</h2>
              <p>
                St. George Capital ("we," "our," or "us") respects your privacy and is committed to protecting your personal information.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website
                or engage with our services.
              </p>

              <h2>2. Information We Collect</h2>

              <h3>2.1 Personal Information</h3>
              <p>We may collect the following personal information:</p>
              <ul>
                <li>Name and contact information (email, phone number)</li>
                <li>Educational background and program information</li>
                <li>Professional experience and qualifications</li>
                <li>Communications you send to us</li>
              </ul>

              <h3>2.2 Usage Information</h3>
              <p>We automatically collect certain information about your use of our website:</p>
              <ul>
                <li>IP address and location information</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent on our site</li>
                <li>Device information</li>
              </ul>

              <h2>3. How We Use Your Information</h2>
              <p>We use the information we collect for the following purposes:</p>
              <ul>
                <li>To communicate with you about our services and events</li>
                <li>To process applications for membership or internships</li>
                <li>To improve our website and services</li>
                <li>To comply with legal obligations</li>
                <li>To send you newsletters or marketing communications (with your consent)</li>
              </ul>

              <h2>4. Information Sharing and Disclosure</h2>
              <p>We do not sell, trade, or otherwise transfer your personal information to third parties, except in the following circumstances:</p>
              <ul>
                <li>With your explicit consent</li>
                <li>To comply with legal requirements or court orders</li>
                <li>To protect our rights, property, or safety</li>
                <li>In connection with a business transfer or merger</li>
              </ul>

              <h2>5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access,
                alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
              </p>

              <h2>6. Cookies and Tracking Technologies</h2>
              <p>
                Our website may use cookies and similar technologies to enhance your experience. You can control cookie settings
                through your browser preferences.
              </p>

              <h2>7. Third-Party Services</h2>
              <p>
                Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites.
                We encourage you to review their privacy policies.
              </p>

              <h2>8. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy,
                unless a longer retention period is required by law.
              </p>

              <h2>9. Your Rights</h2>
              <p>You have the following rights regarding your personal information:</p>
              <ul>
                <li>Access: Request a copy of your personal information</li>
                <li>Correction: Request correction of inaccurate information</li>
                <li>Deletion: Request deletion of your personal information</li>
                <li>Portability: Request transfer of your data</li>
                <li>Objection: Object to processing in certain circumstances</li>
              </ul>

              <h2>10. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards
                are in place to protect your information during such transfers.
              </p>

              <h2>11. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information
                from children under 18.
              </p>

              <h2>12. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new
                Privacy Policy on this page and updating the "Last Updated" date.
              </p>

              <h2>13. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>St. George Capital</strong></p>
                <p>University of Toronto</p>
                <p>Bahen Centre for Information Technology</p>
                <p>40 St. George Street, Toronto, ON M5S 2E4</p>
                <p>Email: outreach@stgeorgecapital.ca</p>
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Disclaimer:</strong> This privacy policy is provided for informational purposes and does not constitute legal advice.
                  St. George Capital is a student-run organization and this policy should not be interpreted as creating any legal rights or obligations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
