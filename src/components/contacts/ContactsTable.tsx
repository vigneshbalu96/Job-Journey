"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FilterInput } from "@/components/common/FilterInput";
import { Mail, Phone, Link2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { shortDate, timeAgo } from "@/lib/format";
import type { ContactRow } from "@/lib/queries/contacts";

export function ContactsTable({ rows, hideCompany, filter = true }: { rows: ContactRow[]; hideCompany?: boolean; filter?: boolean }) {
  const now = Date.now();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => `${c.fullName} ${c.company ?? ""} ${c.title ?? ""} ${c.relationship ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);
  return (
    <>
    {filter && rows.length > 5 && (
      <div className="mb-3 flex items-center gap-2">
        <FilterInput value={query} onChange={setQuery} placeholder="Filter by name, company, role" />
        <span className="ml-auto text-xs text-muted-foreground">{visible.length} of {rows.length}</span>
      </div>
    )}
    <div className="rounded-xl border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {!hideCompany && <TableHead>Company</TableHead>}
            <TableHead>Reach</TableHead>
            <TableHead>Last touch</TableHead>
            <TableHead>Next follow-up</TableHead>
            <TableHead className="text-right">Touches</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visible.map((c) => {
            const overdue = c.nextFollowUpAt && new Date(c.nextFollowUpAt).getTime() < now;
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/contacts/${c.id}`} className="font-medium hover:underline">{c.fullName}</Link>
                  <p className="text-xs text-muted-foreground">{[c.title, c.relationship].filter(Boolean).join(" · ")}</p>
                </TableCell>
                {!hideCompany && (
                  <TableCell>
                    {c.companyId ? <Link href={`/companies/${c.companyId}`} className="hover:underline">{c.company}</Link> : "—"}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {c.email && <a href={`mailto:${c.email}`} title={c.email} className="hover:text-foreground"><Mail className="h-4 w-4" /></a>}
                    {c.phone && <a href={`tel:${c.phone}`} title={c.phone} className="hover:text-foreground"><Phone className="h-4 w-4" /></a>}
                    {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="hover:text-foreground"><Link2 className="h-4 w-4" /></a>}
                    {!c.email && !c.phone && !c.linkedinUrl && "—"}
                  </div>
                </TableCell>
                <TableCell>{timeAgo(c.lastTouchAt)}</TableCell>
                <TableCell className={cn(overdue && "text-destructive font-medium")}>{shortDate(c.nextFollowUpAt)}</TableCell>
                <TableCell className="text-right">{c.touches}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
