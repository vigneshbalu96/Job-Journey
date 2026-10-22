import { Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listContacts } from "@/lib/queries/contacts";
import { listCompanies } from "@/lib/queries/applications";
import { PageHeader } from "@/components/shell/PageHeader";
import { EmptyState } from "@/components/shell/EmptyState";
import { ContactDialog } from "@/components/contacts/ContactDialog";
import { ContactsTable } from "@/components/contacts/ContactsTable";

export const metadata = { title: "Contacts" };

export default async function ContactsPage() {
  const { userId } = await requireUser();
  const [rows, companies] = await Promise.all([listContacts(userId), listCompanies(userId)]);
  return (
    <>
      <PageHeader
        icon={Users}
        title="Contacts"
        subtitle="People in your search, sorted by who needs a follow-up first."
        actions={<ContactDialog companies={companies} />}
      />
      {rows.length === 0 ? (
        <EmptyState icon={Users} title="No contacts yet" description="Add the recruiter who messaged you, or the friend who offered a referral." />
      ) : (
        <ContactsTable rows={rows} />
      )}
    </>
  );
}
