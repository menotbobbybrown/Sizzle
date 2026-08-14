"use client";

import { FormEvent, useState } from "react";
import { FilePenLine, Loader2, MailPlus } from "lucide-react";
import { api } from "@/trpc/react";

export default function CampaignsPage() {
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const campaigns = api.campaign.getAll.useQuery();
  const createCampaign = api.campaign.create.useMutation({
    onSuccess: async (campaign) => {
      setMessage(`${campaign.name} saved as ${campaign.status.toLowerCase()}.`);
      setName(""); setSubject(""); setHtmlContent(""); setOpen(false);
      await utils.campaign.getAll.invalidate();
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !subject.trim() || !htmlContent.trim()) return setMessage("Campaign name, subject, and email HTML are required.");
    setMessage(null);
    createCampaign.mutate({ name: name.trim(), subject: subject.trim(), htmlContent: htmlContent.trim() });
  };

  if (campaigns.isLoading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;
  return <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Email marketing</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Campaigns</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Create and manage campaign records in your active Sizzle workspace.</p></div><button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"><MailPlus className="h-4 w-4" /> New campaign</button></div>
    {open ? <form onSubmit={submit} className="rounded-xl border border-zinc-200 bg-white p-5"><h2 className="font-semibold text-zinc-900">Draft an email campaign</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-zinc-700">Campaign name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2" placeholder="Spring launch" /></label><label className="text-sm font-semibold text-zinc-700">Email subject<input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2" placeholder="A new resource for creators" /></label></div><label className="mt-4 block text-sm font-semibold text-zinc-700">HTML content<textarea value={htmlContent} onChange={(event) => setHtmlContent(event.target.value)} className="mt-2 min-h-36 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-mono text-xs outline-none ring-zinc-900 focus:ring-2" placeholder="<h1>Hello</h1><p>Your update goes here.</p>" /></label><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">Cancel</button><button type="submit" disabled={createCampaign.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60">{createCampaign.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save campaign"}</button></div></form> : null}
    <div aria-live="polite">{message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}{campaigns.error || createCampaign.error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{campaigns.error?.message ?? createCampaign.error?.message}</p> : null}</div>
    {campaigns.data?.length ? <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="hidden grid-cols-[minmax(0,1fr)_120px_110px] gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid"><span>Campaign</span><span>Status</span><span className="text-right">Recipients</span></div><div className="divide-y divide-zinc-100">{campaigns.data.map((campaign) => <article key={campaign.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_110px] sm:items-center sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{campaign.name}</p><p className="mt-1 truncate text-xs text-zinc-500">{campaign.subject} · created {new Date(campaign.createdAt).toLocaleDateString()}</p></div><span className="w-fit rounded-full bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-600">{campaign.status}</span><p className="text-sm font-semibold text-zinc-900 sm:text-right">{campaign._count.sends}</p></article>)}</div></div> : <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400"><FilePenLine className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-zinc-900">No campaigns yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Save a campaign draft and continue the delivery workflow through the existing Sizzle campaign service.</p></div>}
  </div>;
}
