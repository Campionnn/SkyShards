import React from "react";
import { Shield, Eye, Cookie, Database, Mail, Calendar } from "lucide-react";

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-slate-400">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
      </div>

      {/* Content */}
      <div className="space-y-8">
        {/* Introduction */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Eye className="w-5 h-5 mr-2 text-purple-400" />
            Introduction
          </h2>
          <p className="text-slate-300 leading-relaxed">
            At SkyShards, we respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard information when you use our
            Hypixel SkyBlock shard fusion calculator and related services.
          </p>
        </section>

        {/* Information We Collect */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2 text-purple-400" />
            Information We Collect
          </h2>
          <div className="space-y-4 text-slate-300">
            <div>
              <h3 className="font-medium text-white mb-2">Usage Data</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Calculator settings and preferences</li>
                <li>Shard fusion calculations performed</li>
                <li>Feature usage patterns</li>
                <li>Device and browser information</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-white mb-2">Local Storage</h3>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Custom rates and settings</li>
                <li>User preferences (saved locally)</li>
                <li>Session data for functionality</li>
              </ul>
            </div>
          </div>
        </section>

        {/* How We Use Information */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-purple-400" />
            How We Use Your Information
          </h2>
          <div className="text-slate-300 space-y-2">
            <p>
              • <strong className="text-white">Provide Services:</strong> Calculate optimal shard fusion paths and display results
            </p>
            <p>
              • <strong className="text-white">Improve Experience:</strong> Enhance calculator accuracy and add new features
            </p>
            <p>
              • <strong className="text-white">Analytics:</strong> Understand usage patterns to optimize performance
            </p>
            <p>
              • <strong className="text-white">Maintenance:</strong> Monitor and maintain service functionality
            </p>
          </div>
        </section>

        {/* Cookies and Local Storage */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Cookie className="w-5 h-5 mr-2 text-purple-400" />
            Cookies and Local Storage
          </h2>
          <div className="text-slate-300 space-y-3">
            <p>We use browser local storage and cookies to enhance your experience:</p>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Essential Cookies</h4>
              <p className="text-sm">Required for core calculator functionality and user preferences.</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2">Analytics Cookies</h4>
              <p className="text-sm">Help us understand how users interact with our calculator to improve performance.</p>
            </div>
          </div>
        </section>

        {/* Third-Party Services */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Third-Party Services</h2>
          <div className="text-slate-300 space-y-3">
            <p>We may use the following third-party services:</p>
            <div className="space-y-2 text-sm">
              <p>
                • <strong className="text-white">Google Analytics:</strong> For usage analytics and performance monitoring
              </p>
              <p>
                • <strong className="text-white">Ezoic:</strong> For website optimization and advertising
              </p>
              <p>
                • <strong className="text-white">Cookiebot:</strong> For cookie consent management and compliance
              </p>
              <p>
                • <strong className="text-white">Cloudflare:</strong> For content delivery and security
              </p>
            </div>
            <p className="text-sm">Each service has its own privacy policy, and we encourage you to review them.</p>
          </div>
        </section>

        {/* Your Rights */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Your Rights</h2>
          <div className="text-slate-300 space-y-2 text-sm">
            <p>
              • <strong className="text-white">Access:</strong> You can view data stored in your browser's local storage
            </p>
            <p>
              • <strong className="text-white">Delete:</strong> Clear your browser data to remove stored information
            </p>
            <p>
              • <strong className="text-white">Control:</strong> Disable cookies through your browser settings
            </p>
            <p>
              • <strong className="text-white">Opt-out:</strong> Contact us to request data removal
            </p>
          </div>
        </section>

        {/* Data Security */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Data Security</h2>
          <p className="text-slate-300 leading-relaxed">
            We implement appropriate security measures to protect your information. Most data is stored locally in your browser and not transmitted to our servers. When data is transmitted, we use
            secure HTTPS connections and industry-standard security practices.
          </p>
        </section>

        {/* Contact Information */}
        <section className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-purple-400" />
            Contact Us
          </h2>
          <div className="text-slate-300">
            <p className="mb-3">If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="space-y-2 text-sm">
              <p>
                • <strong className="text-white">Email:</strong>{" "}
                <a href="mailto:skyshardsdev@gmail.com" className="text-purple-400 hover:text-purple-300">
                  skyshardsdev@gmail.com
                </a>
              </p>
              <p>
                • <strong className="text-white">GitHub:</strong>{" "}
                <a href="https://github.com/Campionnn/SkyShards" className="text-purple-400 hover:text-purple-300">
                  github.com/Campionnn/SkyShards
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Changes to Policy */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
          <p className="text-slate-300 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last updated" date at the top of this policy. Your continued use of
            SkyShards after any changes constitutes acceptance of the new policy.
          </p>
        </section>

        {/* Ezoic Privacy Policy Embed */}
        <section className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Third-Party Privacy Policies</h2>
          <div className="text-slate-300">
            <p className="mb-4">This section contains privacy information from our advertising and analytics partners:</p>

            {/* Ezoic Services Disclosure */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3 text-center uppercase tracking-wider">Ezoic Services</h3>
              <div className="text-sm text-slate-300 leading-relaxed space-y-3">
                <p>
                  This website uses the services of Ezoic Inc. ("Ezoic"), including to manage third-party interest-based advertising. Ezoic may employ a variety of technologies on this website,
                  including tools to serve content, display advertisements and enable advertising to visitors of this website, which may utilize first and third-party cookies.
                </p>

                <p>
                  A cookie is a small text file sent to your device by a web server that enables the website to remember information about your browsing activity. First-party cookies are created by
                  the site you are visiting, while third-party cookies are set by domains other than the one you're visiting. Ezoic and our partners may place third-party cookies, tags, beacons,
                  pixels, and similar technologies to monitor interactions with advertisements and optimize ad targeting.
                </p>

                <p>
                  Please note that disabling cookies may limit access to certain content and features on the website, and rejecting cookies does not eliminate advertisements but will result in
                  non-personalized advertising. You can find more information about cookies and how to manage them{" "}
                  <a href="https://allaboutcookies.org/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                    here
                  </a>
                  .
                </p>

                <p>The following information may be collected, used, and stored in a cookie when serving personalized ads:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>IP address</li>
                  <li>Operating system type and version</li>
                  <li>Device type</li>
                  <li>Language preferences</li>
                  <li>Web browser type</li>
                  <li>Email (in a hashed or encrypted form)</li>
                </ul>

                <p>
                  Ezoic and its partners may use this data in combination with information that has been independently collected to deliver targeted advertisements across various platforms and
                  websites. Ezoic's partners may also gather additional data, such as unique IDs, advertising IDs, geolocation data, usage data, device information, traffic data, referral sources, and
                  interactions between users and websites or advertisements, to create audience segments for targeted advertising across different devices, browsers, and apps.
                </p>

                <p>
                  You can find more information about interest-based advertising and how to manage them{" "}
                  <a href="https://youradchoices.com/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                    here
                  </a>
                  .
                </p>

                <div className="mt-4 pt-3 border-t border-slate-600">
                  <p className="text-xs text-slate-400">
                    You can view{" "}
                    <a href="https://ezoic.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                      Ezoic's privacy policy
                    </a>{" "}
                    or{" "}
                    <a href="https://www.ezoic.com/privacy-policy/advertising-partners/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                      view Ezoic's advertising partners
                    </a>{" "}
                    for additional information.
                  </p>
                </div>
              </div>
            </div>

            <span id="ezoic-privacy-policy-embed"></span>
          </div>
        </section>
      </div>

      {/* Back to Calculator */}
      <div className="text-center mt-12">
        <a href="/" className="inline-flex items-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors duration-200">
          Back to Calculator
        </a>
      </div>
    </div>
  );
};
