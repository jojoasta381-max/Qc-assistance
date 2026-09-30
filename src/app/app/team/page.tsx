'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  CheckCircle2,
  Trash2,
  Sparkles,
  Building2,
  KeyRound,
} from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'QC_MANAGER' | 'QC_INSPECTOR' | 'VIEWER';
  status: 'ACTIVE' | 'PENDING';
  addedDate: string;
}

export default function AppTeamPage() {
  const { user, tenant } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'usr-1',
      name: 'Pravin',
      email: 'pravin@spandsons.com',
      role: 'QC_INSPECTOR',
      status: 'ACTIVE',
      addedDate: '2026-09-01',
    },
    {
      id: 'usr-2',
      name: 'Gogulnath',
      email: 'gogulnath@spandsons.com',
      role: 'QC_INSPECTOR',
      status: 'ACTIVE',
      addedDate: '2026-09-05',
    },
    {
      id: 'usr-3',
      name: 'Karthik Raja',
      email: 'karthik@apexharness.com',
      role: 'OWNER',
      status: 'ACTIVE',
      addedDate: '2026-09-10',
    },
  ]);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'QC_MANAGER' | 'QC_INSPECTOR' | 'VIEWER'>('QC_INSPECTOR');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    const newMember: TeamMember = {
      id: `usr-${Date.now()}`,
      name: inviteName || inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'PENDING',
      addedDate: new Date().toISOString().slice(0, 10),
    };

    setMembers([...members, newMember]);
    setIsInviteModalOpen(false);
    setInviteEmail('');
    setInviteName('');
    showToast(`Sent invitation to ${inviteEmail}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0A1120] border border-sky-500/40 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-sky-400" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-sky-400 text-xs font-mono font-bold mb-1">
            <Users className="w-3.5 h-3.5" />
            ORGANIZATION &amp; RBAC
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Team Members &amp; Role-Based Access
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage organization members, assign inspection roles, and control QC review report approval permissions.
          </p>
        </div>

        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto shadow-lg"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* Tenant Partition Details */}
      <div className="p-5 rounded-xl bg-[#0A1120] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-white font-bold block">{tenant?.name || 'Spandsons Horizon Engineering'}</span>
            <span className="text-slate-400 text-[11px]">Tenant Partition ID: {tenant?.slug || 'spandsons'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
            AES-256 Multi-Tenant Isolation Active
          </span>
        </div>
      </div>

      {/* Member Table */}
      <section className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Active Organization Members</h2>
          <span className="text-xs font-mono text-slate-400">{members.length} Members</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Engineer / Member</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Member Since</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-slate-300">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-white/[0.02] transition">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-white/5 text-sky-400 font-bold flex items-center justify-center text-xs">
                        {m.name[0]}
                      </div>
                      <div>
                        <div className="font-sans font-medium text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.role === 'OWNER'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : m.role === 'QC_MANAGER'
                          ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {m.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{m.addedDate}</td>
                  <td className="py-3 px-3 text-right">
                    {m.role !== 'OWNER' && (
                      <button
                        onClick={() => {
                          setMembers(members.filter((x) => x.id !== m.id));
                          showToast(`Removed ${m.name} from organization.`);
                        }}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* RBAC Permission Matrix Reference */}
      <section className="p-6 rounded-2xl bg-[#0A1120] border border-white/10 shadow-xl space-y-4">
        <div>
          <h2 className="text-base font-bold text-white">Role Permission Matrix (RBAC)</h2>
          <p className="text-xs text-slate-400">
            Default permission scopes enforced across the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="font-bold text-purple-400">OWNER</div>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              <li>&bull; Full Organization Access</li>
              <li>&bull; Manage Billing &amp; Quota</li>
              <li>&bull; Delete Organization Partition</li>
              <li>&bull; All Inspector Privileges</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="font-bold text-sky-400">QC_MANAGER</div>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              <li>&bull; Configure Custom Plant SOPs</li>
              <li>&bull; Review &amp; Override Discrepancies</li>
              <li>&bull; Invite Inspectors &amp; Auditors</li>
              <li>&bull; Export QC Review Reports</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="font-bold text-emerald-400">QC_INSPECTOR</div>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              <li>&bull; Upload Drawings &amp; Manuals</li>
              <li>&bull; Run Automated QC Inspections</li>
              <li>&bull; Log False Positive Feedback</li>
              <li>&bull; Edit CAD Schematics</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
            <div className="font-bold text-slate-400">VIEWER / AUDITOR</div>
            <ul className="space-y-1 text-slate-300 text-[11px]">
              <li>&bull; Read-Only Inspection History</li>
              <li>&bull; Download QC Review Reports</li>
              <li>&bull; View Quality Pareto Analytics</li>
              <li>&bull; No Schematic Modification</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-[#0A1120] border border-white/20 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Invite Engineer to Organization</h3>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senthil Kumar"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Corporate Email</label>
                <input
                  type="email"
                  required
                  placeholder="senthil@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e: any) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                >
                  <option value="QC_MANAGER">QC Manager</option>
                  <option value="QC_INSPECTOR">QC Inspector</option>
                  <option value="VIEWER">Viewer / Auditor</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 text-xs font-bold shadow-lg"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
