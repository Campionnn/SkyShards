import React from "react";
import { Shield } from "lucide-react";

const Divider = () => <hr className="my-6 border-slate-700" />;

const PrivacyPolicy: React.FC = () => (
  <div className="max-w-2xl mx-auto p-6 text-slate-200">
    <div className="text-center mb-6">
      <div className="w-16 h-16 bg-purple-500/20 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-purple-400" />
      </div>
    </div>
    <h1 className="text-3xl font-extrabold mb-4 text-slate-100">Privacy Policy</h1>
    <p className="mb-4 italic text-slate-400">
      This website is a fan-made tool for SkyShards and is not affiliated with any official game publisher. We value your privacy and strive to keep your data safe and minimal.
    </p>

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">What We Collect</h2>
    <ul className="list-disc pl-6 mb-4 text-slate-400">
      <li>
        <span className="font-bold">No personal information</span> is collected.
      </li>
      <li>Anonymous usage data (like page views) may be collected for analytics and improvement.</li>
      <li>No account or login is required.</li>
    </ul>

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">Ko-fi Support</h2>
    <ul className="list-disc pl-6 mb-4 text-slate-400">
      <li>
        If you support us via{" "}
        <a href="https://ko-fi.com/" target="_blank" rel="noopener noreferrer" className="text-amber-300/70 underline font-bold">
          Ko-fi
        </a>
        , review Ko-fi’s own privacy policy.
      </li>
      <li>
        We do <span className="font-bold">not</span> receive personal data from Ko-fi except your public username if you leave a message.
      </li>
    </ul>

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">Cookies</h2>
    <ul className="list-disc pl-6 mb-4 text-slate-400">
      <li>Cookies may be used for basic functionality (e.g., remembering your settings).</li>
      <li>No tracking cookies for advertising or profiling.</li>
    </ul>

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">Third-Party Services</h2>
    <ul className="list-disc pl-6 mb-4 text-slate-400">
      <li>Links to third-party sites (e.g., Ko-fi) are for your convenience.</li>
      <li>
        We are <span className="italic">not responsible</span> for their content or privacy practices.
      </li>
    </ul>

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">Contact</h2>
    <p className="mb-4 text-slate-400">For questions or concerns about privacy, contact us via the Ko-fi page or GitHub issues.</p>

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">Policy Updates</h2>
    <p className="mb-4 text-slate-400">This policy may be updated as needed. Please check back for changes.</p>
  </div>
);

export default PrivacyPolicy;
