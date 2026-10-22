import { Mail } from "lucide-react";
import { ContactLinks, PageHeaderIcon } from "../components";

export const ContactPage = () => (
  <div className="max-w-xl mx-auto py-10 px-4 text-slate-200">
    <PageHeaderIcon icon={Mail} className="mb-6" />
    <h1 className="text-2xl font-bold mb-4 text-slate-100">Contact Us</h1>
    <p className="mb-2 text-slate-400">Have questions, feedback, or suggestions?</p>
    <hr className="my-6 border-slate-700" />
    <ContactLinks />
  </div>
);
