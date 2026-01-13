import { Section, SectionHeader } from '@/components/section';
import { Card, CardContent } from '@/components/card';

export default function TermsOfUsePage() {
  return (
    <>
      <Section className="pt-32 pb-16" dark>
        <div className="max-w-4xl">
          <SectionHeader
            title="Terms of Use"
            subtitle="Terms and conditions for using St. George Capital's website and services"
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

              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using the St. George Capital website ("Site") and our services, you accept and agree to be bound by the
                terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                St. George Capital is a student-run quantitative investment and research organization at the University of Toronto.
                Our website provides information about our organization, research publications, career opportunities, and educational content.
              </p>

              <h2>3. Educational and Informational Purpose</h2>
              <p>
                <strong>Important Disclaimer:</strong> All information provided on this website is for educational and informational purposes only.
                Nothing on this site should be construed as investment advice, financial planning, or a recommendation to buy or sell any securities.
                Past performance does not guarantee future results.
              </p>

              <h2>4. No Investment Advice</h2>
              <p>
                St. George Capital does not provide investment advice, financial planning services, or recommendations. Our research and
                analyses are educational in nature and should not be used as the sole basis for investment decisions. Always consult with
                qualified financial professionals before making investment decisions.
              </p>

              <h2>5. Student-Run Organization</h2>
              <p>
                St. George Capital is operated by University of Toronto students. While we strive for accuracy and professionalism,
                our activities are educational and should be viewed in that context. We are not registered investment advisors or broker-dealers.
              </p>

              <h2>6. User Responsibilities</h2>

              <h3>6.1 Account Security</h3>
              <p>If you create an account on our website, you are responsible for:</p>
              <ul>
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
              </ul>

              <h3>6.2 Acceptable Use</h3>
              <p>You agree not to use our website to:</p>
              <ul>
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe on intellectual property rights</li>
                <li>Transmit harmful or malicious code</li>
                <li>Harass, abuse, or harm others</li>
                <li>Attempt to gain unauthorized access to our systems</li>
              </ul>

              <h2>7. Intellectual Property</h2>

              <h3>7.1 Our Content</h3>
              <p>
                All content on this website, including text, graphics, logos, images, and research materials, is the property of
                St. George Capital or our licensors and is protected by copyright and other intellectual property laws.
              </p>

              <h3>7.2 Limited License</h3>
              <p>
                We grant you a limited, non-exclusive, non-transferable license to access and use our website for personal,
                non-commercial purposes, subject to these Terms of Use.
              </p>

              <h3>7.3 User-Generated Content</h3>
              <p>
                By submitting content to our website, you grant us a worldwide, royalty-free license to use, display, and distribute
                your content in connection with our services.
              </p>

              <h2>8. Privacy and Data Protection</h2>
              <p>
                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of our website,
                to understand our practices regarding the collection and use of your personal information.
              </p>

              <h2>9. Disclaimer of Warranties</h2>
              <p>
                Our website and services are provided "as is" and "as available" without warranties of any kind, either express or implied,
                including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>

              <h2>10. Limitation of Liability</h2>
              <p>
                In no event shall St. George Capital, its officers, directors, employees, or agents be liable for any indirect, incidental,
                special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other
                intangible losses, resulting from your use of our website or services.
              </p>

              <h2>11. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless St. George Capital and its affiliates from any claims, losses, liability,
                damages, and expenses arising from your use of our website or violation of these terms.
              </p>

              <h2>12. Third-Party Links</h2>
              <p>
                Our website may contain links to third-party websites. We are not responsible for the content, privacy policies,
                or practices of these external sites. Your use of third-party websites is at your own risk.
              </p>

              <h2>13. Termination</h2>
              <p>
                We reserve the right to terminate or suspend your account and access to our services at our sole discretion,
                without prior notice, for conduct that we believe violates these Terms of Use or is harmful to other users,
                us, or third parties, or for any other reason.
              </p>

              <h2>14. Governing Law</h2>
              <p>
                These Terms of Use shall be governed by and construed in accordance with the laws of the Province of Ontario,
                Canada, without regard to its conflict of law provisions.
              </p>

              <h2>15. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Use at any time. We will notify users of material changes by posting
                the updated terms on this page and updating the "Last Updated" date.
              </p>

              <h2>16. Severability</h2>
              <p>
                If any provision of these Terms of Use is found to be unenforceable or invalid, that provision will be limited or
                eliminated to the minimum extent necessary so that the Terms of Use will otherwise remain in full force and effect.
              </p>

              <h2>17. Entire Agreement</h2>
              <p>
                These Terms of Use constitute the entire agreement between you and St. George Capital regarding the use of our website
                and services, superseding any prior agreements.
              </p>

              <h2>18. Contact Information</h2>
              <p>
                If you have any questions about these Terms of Use, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p><strong>St. George Capital</strong></p>
                <p>University of Toronto</p>
                <p>Bahen Centre for Information Technology</p>
                <p>40 St. George Street, Toronto, ON M5S 2E4</p>
                <p>Email: outreach@stgeorgecapital.ca</p>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Educational Disclaimer:</strong> St. George Capital is a student-run organization. Our activities are strictly
                  educational and should not be interpreted as professional financial services. All content is provided for learning purposes only.
                </p>
              </div>

              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Investment Risk Warning:</strong> Investing involves risk. The value of investments can go down as well as up,
                  and you may not get back the full amount invested. Past performance is not indicative of future results. This website
                  does not constitute investment advice.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </>
  );
}
