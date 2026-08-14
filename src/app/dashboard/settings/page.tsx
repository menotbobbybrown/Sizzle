"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { api } from "@/trpc/react";

export default function SettingsPage() {
  const utils = api.useUtils();
  const workspace = api.tenant.getCurrent.useQuery();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const updateWorkspace = api.tenant.update.useMutation({
    onSuccess: async () => {
      setMessage("Workspace settings saved.");
      await utils.tenant.getCurrent.invalidate();
    },
  });

  useEffect(() => {
    if (!workspace.data) return;
    setName(workspace.data.name);
    setBio(workspace.data.bio ?? "");
    setLogoUrl(workspace.data.logoUrl ?? "");
    setBannerUrl(workspace.data.bannerUrl ?? "");
  }, [workspace.data]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return setMessage("Workspace name is required.");
    setMessage(null);
    updateWorkspace.mutate({ name: name.trim(), bio: bio.trim() || undefined, logoUrl: logoUrl.trim() || undefined, bannerUrl: bannerUrl.trim() || undefined });
  };

  if (workspace.isLoading) return <div className="flex min-h-80 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;
  if (workspace.error || !workspace.data) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{workspace.error?.message ?? "Workspace not found."}</div>;

  return <div className="mx-auto max-w-2xl"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Workspace profile</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-900">Settings</h1><p className="mt-2 text-sm leading-6 text-zinc-500">These values are saved directly to your active Sizzle workspace.</p></div><form onSubmit={submit} className="mt-7 space-y-5 rounded-xl border border-zinc-200 bg-white p-5 sm:p-6"><label className="block text-sm font-semibold text-zinc-700">Display name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2" placeholder="Your name or brand" /></label><div><p className="text-sm font-semibold text-zinc-700">Storefront handle</p><div className="mt-2 flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5"><span className="text-sm text-zinc-500">sizzle.so/</span><span className="font-mono text-sm text-zinc-800">{workspace.data.handle}</span></div><p className="mt-2 text-xs text-zinc-500">Handles are reserved during onboarding and cannot be changed from this screen.</p></div><label className="block text-sm font-semibold text-zinc-700">Bio<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="mt-2 w-full resize-y rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2" placeholder="Tell visitors about your store..." /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-semibold text-zinc-700">Logo URL<input value={logoUrl} onChange={(event) => setLogoUrl(event.target.value)} type="url" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2" placeholder="https://…" /></label><label className="block text-sm font-semibold text-zinc-700">Banner URL<input value={bannerUrl} onChange={(event) => setBannerUrl(event.target.value)} type="url" className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none ring-zinc-900 focus:ring-2" placeholder="https://…" /></label></div>{message ? <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4" />{message}</p> : null}{updateWorkspace.error ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{updateWorkspace.error.message}</p> : null}<div className="flex justify-end border-t border-zinc-100 pt-5"><button type="submit" disabled={updateWorkspace.isPending} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60">{updateWorkspace.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}</button></div></form></div>;
}
