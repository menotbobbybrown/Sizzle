export type SubscriberDraft = { email: string; name?: string };

export function parseSubscriberLines(value: string): SubscriberDraft[] {
  const records = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [email = "", ...nameParts] = line.split(",");
    const name = nameParts.join(",").trim();
    return { email: email.trim().toLowerCase(), ...(name ? { name } : {}) };
  });
  return Array.from(new Map(records.map((record) => [record.email, record])).values());
}
