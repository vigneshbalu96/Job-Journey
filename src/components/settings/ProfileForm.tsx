"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, FormError } from "@/components/forms/Field";
import { SelectField } from "@/components/forms/SelectField";
import { updateProfile } from "@/actions/profile";
import { parseTags } from "@/components/notes/constants";
import { STAGE_LABEL } from "@/lib/stages";
import type { Profile } from "@/db/schema";

const FOLLOW_UP_STAGES = ["applied", "screening", "interview", "offer"] as const;

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [timezone, setTimezone] = useState(profile.timezone);
  const [digestHour, setDigestHour] = useState(String(profile.digestHour));
  const [digestEnabled, setDigestEnabled] = useState(profile.digestEnabled);
  const [weeklyTarget, setWeeklyTarget] = useState(String(profile.weeklyTarget));
  const [masterProfile, setMasterProfile] = useState(profile.masterProfile ?? "");
  const [roles, setRoles] = useState(profile.targetRoles.join(", "));
  const [locations, setLocations] = useState(profile.targetLocations.join(", "));
  const [followUp, setFollowUp] = useState<Record<string, string>>(
    Object.fromEntries(FOLLOW_UP_STAGES.map((s) => [s, String(profile.followUpDays[s] ?? "")])),
  );

  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Asia/Kolkata", "UTC"];
    if (!list.includes(timezone)) list.unshift(timezone);
    return list.map((z) => ({ value: z, label: z.replace(/_/g, " ") }));
  }, [timezone]);
  const hours = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}:00` }));

  const save = () =>
    start(async () => {
      setError(null);
      const followUpDays = Object.fromEntries(
        FOLLOW_UP_STAGES.filter((s) => followUp[s] !== "").map((s) => [s, Number(followUp[s])]),
      );
      const r = await updateProfile({
        displayName: displayName || null,
        timezone,
        digestHour: Number(digestHour),
        digestEnabled,
        weeklyTarget: Number(weeklyTarget) || 5,
        masterProfile: masterProfile || null,
        targetRoles: parseTags(roles),
        targetLocations: parseTags(locations),
        followUpDays,
      });
      if (!r.ok) return setError(r.error);
      toast.success("Settings saved");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">You</CardTitle>
          <CardDescription>Shown in the sidebar and used to time your day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Display name" htmlFor="displayName">
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <Field label="Timezone" htmlFor="timezone">
            <SelectField id="timezone" value={timezone} onChange={(v) => v && setTimezone(v)} options={zones} />
          </Field>
          <Field label="Target roles" htmlFor="roles" hint="comma separated; the AI fit score uses these">
            <Input id="roles" value={roles} onChange={(e) => setRoles(e.target.value)} placeholder="Senior Frontend Engineer, Full-stack Lead" />
          </Field>
          <Field label="Target locations" htmlFor="locations" hint="comma separated">
            <Input id="locations" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Bengaluru, Remote" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily digest</CardTitle>
          <CardDescription>One email a day with what is overdue, due today, and coming up.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Send me the digest</p>
              <p className="text-xs text-muted-foreground">Skipped automatically on days with nothing to report.</p>
            </div>
            <Switch checked={digestEnabled} onCheckedChange={setDigestEnabled} />
          </div>
          <Field label="Send at (local time)" htmlFor="digestHour">
            <SelectField id="digestHour" value={digestHour} onChange={(v) => v && setDigestHour(v)} options={hours} />
          </Field>
          <Field label="Weekly applications target" htmlFor="weeklyTarget" hint="Drives the ring on Today and the streak line in the digest.">
            <Input id="weeklyTarget" inputMode="numeric" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value.replace(/\D/g, ""))} />
          </Field>
          <div>
            <p className="text-sm font-medium mb-2">Automatic follow-up after entering a stage (days)</p>
            <div className="grid grid-cols-4 gap-2">
              {FOLLOW_UP_STAGES.map((s) => (
                <Field key={s} label={STAGE_LABEL[s]} htmlFor={`fu-${s}`}>
                  <Input id={`fu-${s}`} inputMode="numeric" value={followUp[s]} onChange={(e) => setFollowUp({ ...followUp, [s]: e.target.value.replace(/\D/g, "") })} placeholder="—" />
                </Field>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Master profile</CardTitle>
          <CardDescription>
            Your experience, strengths, must-haves and deal-breakers in your own words. The AI scores every job description against this and tailors resume bullets and cover letters from it. Nothing here is sent anywhere until you run an AI action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea rows={14} value={masterProfile} onChange={(e) => setMasterProfile(e.target.value)} placeholder={"8 years building web products…\nStrongest in React/Next.js, Node, Postgres…\nLooking for: senior IC or lead, product-minded teams, hybrid in Bengaluru or remote.\nAvoid: pure maintenance, >50% travel."} />
        </CardContent>
      </Card>

      <div className="lg:col-span-2 flex items-center justify-between gap-4">
        <FormError message={error} />
        <Button onClick={save} disabled={pending} className="ml-auto">Save settings</Button>
      </div>
    </div>
  );
}
