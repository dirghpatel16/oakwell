"use client";
import React, { useEffect, useState } from "react";
import {
  User,
  Building2,
  Key,
  Webhook,
  Bell,
  Shield,
  ExternalLink,
  ChevronRight,
  Check,
} from "lucide-react";
import { useWorkspace } from "@/lib/hooks";
import * as api from "@/lib/api";

export default function SettingsPage() {
  const { data: workspaceData, refresh: refreshWorkspace } = useWorkspace();
  const [companyName, setCompanyName] = useState("");
  const [valueProp, setValueProp] = useState("");
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (workspaceData?.workspace) {
      setCompanyName(workspaceData.workspace.company_name || "");
      setValueProp(workspaceData.workspace.value_prop || "");
      setUserRole(workspaceData.workspace.user_role || "");
    }
  }, [workspaceData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveWorkspace({
        company_name: companyName || undefined,
        value_prop: valueProp || undefined,
        user_role: (userRole as api.WorkspacePersona["user_role"]) || undefined,
      });
      setSaved(true);
      refreshWorkspace();
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // show nothing — user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-[900px] mx-auto space-y-8">
      <div className="border-b border-zinc-800 pb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Manage your workspace, integrations, and agent configuration</p>
      </div>

      <SettingsSection icon={<User className="w-4 h-4" />} title="Profile" description="Your personal account settings">
        <div className="space-y-4">
          <SettingsRow label="Name" value="Dirgh Patel" />
          <SettingsRow label="Email" value="dirgh@oakwell.ai" />
          <SettingsRow label="Role" value="Admin (CRO View)" badge />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Building2 className="w-4 h-4" />} title="Workspace" description="Organization and team settings">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Company Name</label>
            <input
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              placeholder="e.g. Acme Corp"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Value Proposition</label>
            <textarea
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
              placeholder="e.g. We help sales teams close deals 2x faster with AI-powered intelligence"
              value={valueProp}
              onChange={e => setValueProp(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500">Your Role</label>
            <select
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              value={userRole}
              onChange={e => setUserRole(e.target.value)}
            >
              <option value="">Select role...</option>
              <option value="sdr">SDR / BDR</option>
              <option value="ae">Account Executive</option>
              <option value="manager">Sales Manager</option>
              <option value="exec">Executive / VP</option>
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {saved ? <><Check className="w-3 h-3" /> Saved</> : saving ? "Saving..." : "Save Workspace"}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Webhook className="w-4 h-4" />} title="Integrations" description="Connect your CRM, call recorder, and notification channels">
        <div className="space-y-3">
          <IntegrationRow name="HubSpot CRM" description="Sync deals, contacts, and pipeline data" connected={false} />
          <IntegrationRow name="Salesforce" description="Import opportunities and account intelligence" connected={false} />
          <IntegrationRow name="Gong / Chorus" description="Auto-import call transcripts for analysis" connected={false} />
          <IntegrationRow name="Slack" description="Receive real-time alerts and Sentinel notifications" connected={false} />
          <IntegrationRow name="Google Meet / Zoom" description="Live meeting sidekick and transcript capture" connected={false} />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Bell className="w-4 h-4" />} title="Slack Alert Configuration" description="Route different alert types to specific Slack channels">
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-3">
            <p className="text-xs font-medium text-zinc-400 mb-2">Channel Routing</p>
            <SlackChannelRow channel="#oak-critical-alerts" alertType="Critical & High severity" enabled={true} />
            <SlackChannelRow channel="#oak-deal-intel" alertType="Deal risk & competitor mentions" enabled={true} />
            <SlackChannelRow channel="#oak-market-intel" alertType="Pricing changes & feature launches" enabled={true} />
            <SlackChannelRow channel="#oak-weekly-digest" alertType="Weekly intelligence summary" enabled={false} />
          </div>
          <div className="flex items-center gap-3">
            <button className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-400 hover:text-white transition-colors">
              Test Alert →  #oak-critical-alerts
            </button>
            <button className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              Add Channel
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Key className="w-4 h-4" />} title="API Configuration" description="Manage API keys for the Oakwell engine">
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-zinc-300">Oakwell API Key</p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">oak_live_••••••••••••••••k7f2</p>
            </div>
            <button className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-400 hover:text-white transition-colors">
              Regenerate
            </button>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm text-zinc-300">Backend Endpoint</p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">https://api.oakwll.com (Cloud Run)</p>
            </div>
            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Not Deployed
            </span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={<Bell className="w-4 h-4" />} title="Notifications" description="Control when and how you receive alerts">
        <div className="space-y-3">
          <ToggleRow label="Competitor pricing changes" description="Get alerted when a tracked competitor changes pricing" enabled={true} />
          <ToggleRow label="New feature launches" description="Detect when competitors ship new features" enabled={true} />
          <ToggleRow label="Deal risk alerts" description="Champion changes, competitor mentions in calls" enabled={true} />
          <ToggleRow label="Weekly intelligence digest" description="Sunday email summary of all competitive movements" enabled={false} />
        </div>
      </SettingsSection>

      <SettingsSection icon={<Shield className="w-4 h-4" />} title="Sentinel Configuration" description="Configure the autonomous market monitoring agent">
        <div className="space-y-4">
          <SettingsRow label="Scan Frequency" value="Every 30 minutes" />
          <SettingsRow label="Tracked Competitors" value="4 active (Gong, Clari, Chorus, Outreach)" />
          <SettingsRow label="Total Pages Monitored" value="166" />
          <SettingsRow label="Screenshots Stored" value="2.4 GB / 10 GB" />
          <div className="pt-2">
            <button className="text-xs bg-zinc-900 border border-zinc-800 px-4 py-2 rounded text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-2">
              <ExternalLink className="w-3 h-3" /> Manage Tracked URLs
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800/50 flex items-center gap-3">
        <div className="text-zinc-500">{icon}</div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-[10px] text-zinc-500">{description}</p>
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function SettingsRow({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-zinc-500">{label}</span>
      {badge ? (
        <span className="text-xs font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">{value}</span>
      ) : (
        <span className="text-sm text-zinc-300">{value}</span>
      )}
    </div>
  );
}

function IntegrationRow({ name, description, connected }: { name: string; description: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 group">
      <div>
        <p className="text-sm text-zinc-300 font-medium">{name}</p>
        <p className="text-[10px] text-zinc-500">{description}</p>
      </div>
      {connected ? (
        <span className="text-[10px] font-medium bg-green-500/10 text-green-400 px-2.5 py-1 rounded border border-green-500/20 flex items-center gap-1">
          <Check className="w-3 h-3" /> Connected
        </span>
      ) : (
        <button className="text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center gap-1">
          Connect <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function ToggleRow({ label, description, enabled }: { label: string; description: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-500">{description}</p>
      </div>
      <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${enabled ? "bg-blue-600" : "bg-zinc-700"}`}>
        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
    </div>
  );
}

function SlackChannelRow({ channel, alertType, enabled }: { channel: string; alertType: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">{channel}</span>
        <span className="text-[10px] text-zinc-500">{alertType}</span>
      </div>
      <div className={`w-8 h-4 rounded-full relative cursor-pointer transition-colors ${enabled ? "bg-green-600" : "bg-zinc-700"}`}>
        <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
    </div>
  );
}
