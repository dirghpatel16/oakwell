"use client";
import React, { useState } from "react";
import { 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Building2, 
  Webhook,
  Target,
  MessageSquare,
  Shield,
  Loader2,
  ExternalLink,
  Plus,
  X,
  Zap
} from "lucide-react";

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface CompetitorEntry {
  name: string;
  domain: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>(1);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [crmSelected, setCrmSelected] = useState<string | null>(null);
  const [callRecorder, setCallRecorder] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([
    { name: "", domain: "" },
  ]);
  const [slackConnected, setSlackConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStep, setScanStep] = useState("");

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  const addCompetitor = () => {
    if (competitors.length < 5) {
      setCompetitors([...competitors, { name: "", domain: "" }]);
    }
  };

  const removeCompetitor = (index: number) => {
    setCompetitors(competitors.filter((_, i) => i !== index));
  };

  const updateCompetitor = (index: number, field: "name" | "domain", value: string) => {
    const updated = [...competitors];
    updated[index][field] = value;
    setCompetitors(updated);
  };

  const startInitialScan = () => {
    setIsScanning(true);
    const steps = [
      { progress: 10, label: "Connecting to CRM..." },
      { progress: 25, label: "Importing active deals..." },
      { progress: 40, label: "Scanning competitor websites..." },
      { progress: 55, label: "Extracting pricing & features..." },
      { progress: 70, label: "Analyzing with Vision AI..." },
      { progress: 85, label: "Generating initial risk scores..." },
      { progress: 95, label: "Building your War Room..." },
      { progress: 100, label: "✓ Setup complete!" },
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setScanProgress(steps[i].progress);
        setScanStep(steps[i].label);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col">
      
      {/* Top Progress Bar */}
      <div className="h-1 bg-zinc-900 w-full">
        <div 
          className="h-full bg-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="px-6 py-6 border-b border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center">
            <span className="text-black text-sm font-bold">O</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Oakwell Setup</h1>
            <p className="text-[10px] text-zinc-500">Step {step} of {totalSteps}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 === step ? "bg-blue-500" : 
                i + 1 < step ? "bg-green-500" : 
                "bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-lg animate-fade-up">
          
          {/* STEP 1: Company Details */}
          {step === 1 && (
            <StepContainer
              icon={<Building2 className="w-5 h-5 text-blue-400" />}
              title="Tell us about your company"
              subtitle="This helps us configure your competitive intelligence."
            >
              <div className="space-y-4">
                <InputField 
                  label="Company Name" 
                  placeholder="e.g. Acme Corp" 
                  value={companyName}
                  onChange={setCompanyName}
                />
                <SelectField 
                  label="Industry"
                  value={industry}
                  onChange={setIndustry}
                  options={[
                    { value: "saas", label: "SaaS / Software" },
                    { value: "fintech", label: "Fintech" },
                    { value: "healthtech", label: "Healthtech" },
                    { value: "ecommerce", label: "E-Commerce" },
                    { value: "cybersecurity", label: "Cybersecurity" },
                    { value: "other", label: "Other" },
                  ]}
                />
                <SelectField 
                  label="Sales Team Size"
                  value={teamSize}
                  onChange={setTeamSize}
                  options={[
                    { value: "1-5", label: "1-5 reps" },
                    { value: "6-20", label: "6-20 reps" },
                    { value: "21-50", label: "21-50 reps" },
                    { value: "50+", label: "50+ reps" },
                  ]}
                />
              </div>
            </StepContainer>
          )}

          {/* STEP 2: Connect CRM */}
          {step === 2 && (
            <StepContainer
              icon={<Webhook className="w-5 h-5 text-purple-400" />}
              title="Connect your CRM"
              subtitle="We'll import your deals, pipeline, and contacts automatically."
            >
              <div className="space-y-3">
                <IntegrationOption 
                  name="HubSpot"
                  desc="Sync deals, contacts, pipeline stages"
                  selected={crmSelected === "hubspot"}
                  onSelect={() => setCrmSelected("hubspot")}
                  logo="H"
                  color="bg-orange-500"
                />
                <IntegrationOption 
                  name="Salesforce"
                  desc="Import opportunities and account data"
                  selected={crmSelected === "salesforce"}
                  onSelect={() => setCrmSelected("salesforce")}
                  logo="S"
                  color="bg-blue-500"
                />
                <IntegrationOption 
                  name="Pipedrive"
                  desc="Sync deals and activities"
                  selected={crmSelected === "pipedrive"}
                  onSelect={() => setCrmSelected("pipedrive")}
                  logo="P"
                  color="bg-green-500"
                />
                <button className="w-full text-left p-4 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-700 transition-colors text-xs text-zinc-500 hover:text-zinc-400">
                  + Connect via API key (advanced)
                </button>
              </div>

              <div className="mt-4">
                <SelectField 
                  label="Call Recording Platform"
                  value={callRecorder || ""}
                  onChange={setCallRecorder}
                  options={[
                    { value: "gong", label: "Gong" },
                    { value: "chorus", label: "Chorus (ZoomInfo)" },
                    { value: "zoom", label: "Zoom (native recording)" },
                    { value: "google_meet", label: "Google Meet" },
                    { value: "none", label: "I don't record calls yet" },
                  ]}
                />
              </div>
            </StepContainer>
          )}

          {/* STEP 3: Add Competitors */}
          {step === 3 && (
            <StepContainer
              icon={<Target className="w-5 h-5 text-red-400" />}
              title="Who are you competing against?"
              subtitle="Our Sentinel agent will monitor these competitors 24/7 — pricing, features, messaging."
            >
              <div className="space-y-3">
                {competitors.map((comp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder="Competitor name (e.g. Gong)"
                        value={comp.name}
                        onChange={(e) => updateCompetitor(i, "name", e.target.value)}
                        className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all"
                      />
                      <input
                        type="text"
                        placeholder="Website (e.g. gong.io)"
                        value={comp.domain}
                        onChange={(e) => updateCompetitor(i, "domain", e.target.value)}
                        className="w-full h-10 bg-zinc-900/50 border border-zinc-800 rounded-lg px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all font-mono text-xs"
                      />
                    </div>
                    {competitors.length > 1 && (
                      <button 
                        onClick={() => removeCompetitor(i)}
                        className="mt-2 p-2 text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                {competitors.length < 5 && (
                  <button 
                    onClick={addCompetitor}
                    className="w-full py-3 border border-dashed border-zinc-800 rounded-lg text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Competitor ({competitors.length}/5)
                  </button>
                )}
              </div>
            </StepContainer>
          )}

          {/* STEP 4: Notifications */}
          {step === 4 && (
            <StepContainer
              icon={<MessageSquare className="w-5 h-5 text-amber-400" />}
              title="Set up notifications"
              subtitle="Get real-time alerts when competitors make moves."
            >
              <div className="space-y-4">
                <div 
                  onClick={() => setSlackConnected(!slackConnected)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    slackConnected 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#4A154B] flex items-center justify-center text-white font-bold text-sm">S</div>
                      <div>
                        <p className="text-sm font-medium text-white">Slack</p>
                        <p className="text-[10px] text-zinc-500">Real-time alerts to your team channel</p>
                      </div>
                    </div>
                    {slackConnected ? (
                      <span className="text-[10px] font-medium bg-green-500/10 text-green-400 px-2.5 py-1 rounded border border-green-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">Connect</span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-zinc-500">Alert Preferences</p>
                  <OnboardToggle label="Competitor pricing changes" enabled={true} />
                  <OnboardToggle label="New feature launches" enabled={true} />
                  <OnboardToggle label="Deal risk alerts" enabled={true} />
                  <OnboardToggle label="Competitive mentions in calls" enabled={true} />
                  <OnboardToggle label="Weekly intelligence digest" enabled={false} />
                </div>
              </div>
            </StepContainer>
          )}

          {/* STEP 5: Initial Scan */}
          {step === 5 && (
            <StepContainer
              icon={<Shield className="w-5 h-5 text-green-400" />}
              title={isScanning ? "Setting up your War Room..." : "Ready to deploy"}
              subtitle={isScanning 
                ? "Oakwell agents are analyzing your competitive landscape." 
                : "We'll scan your competitors, import your deals, and build your intelligence dashboard."
              }
            >
              {!isScanning ? (
                <div className="space-y-6">
                  {/* Summary of what was configured */}
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
                    <SummaryRow label="Company" value={companyName || "Not set"} />
                    <SummaryRow label="CRM" value={crmSelected ? crmSelected.charAt(0).toUpperCase() + crmSelected.slice(1) : "Skip"} />
                    <SummaryRow label="Competitors" value={`${competitors.filter(c => c.name).length} tracked`} />
                    <SummaryRow label="Slack" value={slackConnected ? "Connected" : "Skip"} />
                  </div>

                  <button 
                    onClick={startInitialScan}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" /> Deploy Oakwell Agents
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Animated progress */}
                  <div className="space-y-3">
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          scanProgress === 100 ? "bg-green-500" : "bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600 animate-shimmer"
                        }`}
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400 flex items-center gap-2">
                        {scanProgress < 100 ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        )}
                        {scanStep}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500">{scanProgress}%</span>
                    </div>
                  </div>

                  {/* Terminal-style log */}
                  <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-4 font-mono text-[11px] space-y-1.5 max-h-[200px] overflow-y-auto">
                    {scanProgress >= 10 && <LogLine text={`[sentinel] Connecting to ${crmSelected || "CRM"}...`} color="text-zinc-500" />}
                    {scanProgress >= 25 && <LogLine text="[sentinel] Found 14 active deals in pipeline" color="text-green-400" />}
                    {scanProgress >= 40 && (
                      <>
                        {competitors.filter(c => c.name).map((c, i) => (
                          <LogLine key={i} text={`[sentinel] Scanning ${c.domain || c.name}...`} color="text-blue-400" />
                        ))}
                      </>
                    )}
                    {scanProgress >= 55 && <LogLine text="[vision] Extracting pricing tables with GPT-4 Vision" color="text-purple-400" />}
                    {scanProgress >= 70 && <LogLine text="[vision] Cross-referencing claims across 47 pages" color="text-purple-400" />}
                    {scanProgress >= 85 && <LogLine text="[risk] Scored 14 deals — 3 flagged HIGH risk" color="text-amber-400" />}
                    {scanProgress >= 95 && <LogLine text="[engine] War Room populated. 7 alerts generated." color="text-green-400" />}
                    {scanProgress >= 100 && (
                      <LogLine text="[system] ✓ Oakwell is now protecting your revenue." color="text-green-500" bold />
                    )}
                  </div>

                  {scanProgress >= 100 && (
                    <a 
                      href="/dashboard"
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      Enter Your War Room <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </StepContainer>
          )}

          {/* Navigation Buttons */}
          {!(step === 5 && isScanning) && (
            <div className="flex items-center justify-between mt-8">
              <button 
                onClick={() => setStep(Math.max(1, step - 1) as OnboardingStep)}
                disabled={step === 1}
                className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button 
                onClick={() => setStep(Math.min(totalSteps, step + 1) as OnboardingStep)}
                className="flex items-center gap-1.5 text-sm bg-white text-black hover:bg-zinc-200 px-5 py-2 rounded-lg font-medium transition-colors"
              >
                {step === totalSteps ? "Finish" : "Continue"} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StepContainer({ icon, title, subtitle, children }: { 
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-md bg-zinc-900 border border-zinc-800">{icon}</div>
        <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-zinc-500 mb-8">{subtitle}</p>
      {children}
    </div>
  );
}

function InputField({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-400 mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all appearance-none cursor-pointer"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function IntegrationOption({ name, desc, selected, onSelect, logo, color }: {
  name: string; desc: string; selected: boolean; onSelect: () => void; logo: string; color: string;
}) {
  return (
    <div 
      onClick={onSelect}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        selected 
          ? "border-blue-500/30 bg-blue-500/5" 
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white font-bold text-sm`}>
            {logo}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{name}</p>
            <p className="text-[10px] text-zinc-500">{desc}</p>
          </div>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}

function OnboardToggle({ label, enabled: defaultEnabled }: { label: string; enabled: boolean }) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-zinc-300">{label}</span>
      <button 
        onClick={() => setEnabled(!enabled)}
        className={`w-10 h-5 rounded-full relative transition-colors ${enabled ? "bg-blue-600" : "bg-zinc-700"}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs text-zinc-300 font-medium">{value}</span>
    </div>
  );
}

function LogLine({ text, color, bold }: { text: string; color: string; bold?: boolean }) {
  return (
    <p className={`${color} ${bold ? "font-semibold" : ""}`}>{text}</p>
  );
}
