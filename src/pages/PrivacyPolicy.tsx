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

    <Divider />
    <h2 className="text-xl font-semibold mb-2 text-slate-300">Mediavine Programmatic Advertising (Ver 1.1)</h2>
    <p className="mb-4 text-slate-400">
      The Website works with Mediavine to manage third-party interest-based advertising appearing on the Website. Mediavine serves content and advertisements when you visit the Website, which may use first and third-party cookies. A cookie is a small text file which is sent to your computer or mobile device (referred to in this policy as a “device”) by the web server so that a website can remember some information about your browsing activity on the Website.
    </p>
    <p className="mb-4 text-slate-400">
      First party cookies are created by the website that you are visiting. A third-party cookie is frequently used in behavioral advertising and analytics and is created by a domain other than the website you are visiting. Third-party cookies, tags, pixels, beacons and other similar technologies (collectively, “Tags”) may be placed on the Website to monitor interaction with advertising content and to target and optimize advertising. Each internet browser has functionality so that you can block both first and third-party cookies and clear your browser’s cache. The "help" feature of the menu bar on most browsers will tell you how to stop accepting new cookies, how to receive notification of new cookies, how to disable existing cookies and how to clear your browser’s cache. For more information about cookies and how to disable them, you can consult the information at{" "}
      <a href="https://www.allaboutcookies.org/manage-cookies/" target="_blank" rel="noreferrer noopener nofollow" className="text-amber-300/70 underline">
        All About Cookies
      </a>
      .
    </p>
    <p className="mb-4 text-slate-400">
      Without cookies you may not be able to take full advantage of the Website content and features. Please note that rejecting cookies does not mean that you will no longer see ads when you visit our Site. In the event you opt-out, you will still see non-personalized advertisements on the Website.
    </p>
    <p className="mb-4 text-slate-400">The Website collects the following data using a cookie when serving personalized ads:</p>
    <ul className="list-disc pl-6 mb-4 text-slate-400">
      <li>IP Address</li>
      <li>Operating System type</li>
      <li>Operating System version</li>
      <li>Device Type</li>
      <li>Language of the website</li>
      <li>Web browser type</li>
      <li>Email (in hashed form)</li>
    </ul>
    <p className="mb-4 text-slate-400">
      Mediavine Partners (companies listed below with whom Mediavine shares data) may also use this data to link to other end user information the partner has independently collected to deliver targeted advertisements. Mediavine Partners may also separately collect data about end users from other sources, such as advertising IDs or pixels, and link that data to data collected from Mediavine publishers in order to provide interest-based advertising across your online experience, including devices, browsers and apps. This data includes usage data, cookie information, device information, information about interactions between users and advertisements and websites, geolocation data, traffic data, and information about a visitor’s referral source to a particular website. Mediavine Partners may also create unique IDs to create audience segments, which are used to provide targeted advertising.
    </p>
    <p className="mb-4 text-slate-400">
      If you would like more information about this practice and to know your choices to opt-in or opt-out of this data collection, please visit{" "}
      <a href="https://thenai.org/opt-out/" target="_blank" rel="noreferrer noopener nofollow" className="text-amber-300/70 underline">
        National Advertising Initiative opt out page
      </a>
      . You may also visit{" "}
      <a href="http://optout.aboutads.info/#/" target="_blank" rel="noreferrer noopener nofollow" className="text-amber-300/70 underline">
        Digital Advertising Alliance website
      </a>{" "}
      and{" "}
      <a href="http://optout.networkadvertising.org/#" target="_blank" rel="noreferrer noopener nofollow" className="text-amber-300/70 underline">
        Network Advertising Initiative website
      </a>{" "}
      to learn more information about interest-based advertising. You may download the AppChoices app at{" "}
      <a href="https://youradchoices.com/appchoices" target="_blank" rel="noreferrer noopener nofollow" className="text-amber-300/70 underline">
        Digital Advertising Alliance’s AppChoices app
      </a>{" "}
      to opt out in connection with mobile apps, or use the platform controls on your mobile device to opt out.
    </p>
    <p className="mb-4 text-slate-400">
      For specific information about Mediavine Partners, the data each collects and their data collection and privacy policies, please visit{" "}
      <a href="https://www.mediavine.com/ad-partners/" target="_blank" rel="noreferrer noopener nofollow" className="text-amber-300/70 underline">
        Mediavine Partners
      </a>
      .
    </p>
  </div>
);

export default PrivacyPolicy;
