"use client";

import { FormEvent, useState } from "react";
import { Loader2, MailPlus, UserRoundX, UsersRound } from "lucide-react";
import { parseSubscriberLines } from "@/lib/subscriber-import";
import { api } from "@/trpc/react";

export default function SubscribersPage() {
  const utils = api.useUtils();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const subscribers = api.subscriber.getAll.useQuery();
  const stats = api.subscriber.getStats.useQuery();
  const importSubscribers = api.subscriber.importSubscribers.useMutation({
    onSuccess: async (result) => {
      const imported = result.filter((item) => item.status === "imported").length;
      setMessage(`${imported} subscriber${imported === 1 ? "" : "s"} imported or updated.`);
      setImportText("");
      setShowImport(false);
      await Promise.all([utils.subscriber.getAll.invalidate(), utils.subscriber.getStats.invalidate()]);
    },
  });
  const unsubscribe = api.subscriber.unsubscribe.useMutation({
    onSuccess: async (subscriber) => {
      setMessage(`${subscriber.email} has been unsubscribed.`);
      await Promise.all([utils.subscriber.getAll.invalidate(), utils.subscriber.getStats.invalidate()]);
    },
  });

  const submitImport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseSubscriberLines(importText);
    if (!parsed.length) return setMessage("Add at least one email address before importing.");
    if (parsed.some((subscriber) => !/^\S+@\S+\.\S+$/.test(subscriber.email))) return setMessage("Each row needs a valid email address.");
    setMessage(null);
    importSubscribers.mutate({ subscribers: parsed });
  };

  const error = subscribers.error ?? stats.error ?? importSubscribers.error ?? unsubscribe.error;
  if (subscribers.isLoading || stats.isLoading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;

  return (
    <div className="space-y-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Audience</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Subscribers</h1><p className="mt-2 text-sm leading-6 text-zinc-500">Manage the contact records saved in your active Sizzle workspace.</p></div><button type="button" onClick={() => setShowImport((visible) => !visible)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"><MailPlus className="h-4 w-4" /> Import subscribers</button></div>
      <div className="grid gap-4 sm:grid-cols-4">{[{ label: "Total", value: stats.data?.total ?? 0 }, { label: "Active", value: stats.data?.active ?? 0 }, { label: "Unsubscribed", value: stats.data?.unsubscribed ?? 0 }, { label: "Bounced", value: stats.data?.bounced ?? 0 }].map((stat) => <div key={stat.label} className="rounded-xl border border-zinc-200 bg-white p-4"><p className="text-sm text-zinc-500">{stat.label}</p><p className="mt-1 text-2xl font-bold text-zinc-900">{stat.value}</p></div>)}</div>
      {showImport ? <form onSubmit={submitImport} className="rounded-xl border border-zinc-200 bg-white p-5"><div className="flex items-start gap-3"><MailPlus className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500" /><div><h2 className="font-semibold text-zinc-900">Import audience records</h2><p className="mt-1 text-sm text-zinc-500">Add one record per line: <code className="rounded bg-zinc-100 px-1 py-0.5">email,name</code>. Existing addresses are updated.</p></div></div><textarea value={importText} onChange={(event) => setImportText(event.target.value)} className="mt-4 min-h-32 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-mono text-sm outline-none ring-zinc-900 focus:ring-2" placeholder={"ada@example.com,Ada Lovelace\nbob@example.com"} /><div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={() => setShowImport(false)} className="rounded-lg px-3 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100">Cancel</button><button type="submit" disabled={importSubscribers.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60">{importSubscribers.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : "Save subscribers"}</button></div></form> : null}
      <div aria-live="polite">{message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}{error ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error.message}</p> : null}</div>
      {subscribers.data?.length ? <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white"><div className="hidden grid-cols-[minmax(0,1fr)_110px_108px] gap-4 border-b border-zinc-100 bg-zinc-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-500 sm:grid"><span>Subscriber</span><span>Status</span><span className="text-right">Action</span></div><div className="divide-y divide-zinc-100">{subscribers.data.map((subscriber) => <article key={subscriber.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_110px_108px] sm:items-center sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-zinc-900">{subscriber.name ?? "Unnamed subscriber"}</p><p className="mt-1 truncate text-xs text-zinc-500">{subscriber.email} · joined {new Date(subscriber.createdAt).toLocaleDateString()}</p></div><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${subscriber.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{subscriber.status}</span>{subscriber.status === "ACTIVE" ? <button type="button" onClick={() => unsubscribe.mutate({ id: subscriber.id })} disabled={unsubscribe.isPending} className="inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"><UserRoundX className="h-3.5 w-3.5" /> Unsubscribe</button> : <span className="text-xs text-zinc-400 sm:text-right">No action</span>}</article>)}</div></div> : <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400"><UsersRound className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-zinc-900">No subscribers yet</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Import a list or collect emails from your storefront to start building your audience.</p></div>}
    </div>
  );
}
