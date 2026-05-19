"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Contact {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  company: string | null;
  notes: string | null;
  createdAt: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  notes: string;
}

const EMPTY_FORM: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  role: "",
  company: "",
  notes: "",
};

function ContactSheet({
  open,
  onClose,
  initial,
  onSave,
  title,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  initial: ContactFormData;
  onSave: (data: ContactFormData) => Promise<void>;
  title: string;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ContactFormData>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial, open]);

  function handleChange(field: keyof ContactFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    await onSave(form);
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="+1 555 000 0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              placeholder="Hiring Manager"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={form.company}
              onChange={(e) => handleChange("company", e.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Any notes about this contact..."
              rows={3}
            />
          </div>
          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New contact sheet
  const [showNew, setShowNew] = useState(false);

  // Edit sheet
  const [editContact, setEditContact] = useState<Contact | null>(null);

  // Delete dialog
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function fetchContacts() {
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      const data = await res.json();
      setContacts(data);
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  async function handleCreate(form: ContactFormData) {
    setIsSaving(true);
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create contact");
      const created = await res.json();
      setContacts((prev) => [created, ...prev]);
      setShowNew(false);
      toast.success("Contact created");
    } catch {
      toast.error("Failed to create contact");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(form: ContactFormData) {
    if (!editContact) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/contacts/${editContact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to update contact");
      const updated = await res.json();
      setContacts((prev) =>
        prev.map((c) => (c.id === editContact.id ? updated : c))
      );
      setEditContact(null);
      toast.success("Contact updated");
    } catch {
      toast.error("Failed to update contact");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteContact) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/contacts/${deleteContact.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete contact");
      setContacts((prev) => prev.filter((c) => c.id !== deleteContact.id));
      setDeleteContact(null);
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleting(false);
    }
  }

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q) ||
      (c.role ?? "").toLowerCase().includes(q)
    );
  });

  const editForm: ContactFormData = editContact
    ? {
        name: editContact.name,
        email: editContact.email ?? "",
        phone: editContact.phone ?? "",
        role: editContact.role ?? "",
        company: editContact.company ?? "",
        notes: editContact.notes ?? "",
      }
    : EMPTY_FORM;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="size-4" />
          New Contact
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                {["Name", "Role", "Company", "Email", "Phone", "Actions"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4].map((i) => (
                <TableRow key={i}>
                  {[1, 2, 3, 4, 5, 6].map((j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-20">
          <p className="text-sm text-muted-foreground">
            {search ? "No contacts match your search" : "No contacts yet"}
          </p>
          {!search && (
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus className="size-4" />
              Add your first contact
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.role ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{contact.company ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="hover:underline">
                        {contact.email}
                      </a>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {contact.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditContact(contact)}
                        title="Edit contact"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteContact(contact)}
                        title="Delete contact"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* New contact sheet */}
      <ContactSheet
        open={showNew}
        onClose={() => setShowNew(false)}
        initial={EMPTY_FORM}
        onSave={handleCreate}
        title="New Contact"
        isSaving={isSaving}
      />

      {/* Edit contact sheet */}
      <ContactSheet
        open={!!editContact}
        onClose={() => setEditContact(null)}
        initial={editForm}
        onSave={handleEdit}
        title="Edit Contact"
        isSaving={isSaving}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteContact} onOpenChange={(v) => !v && setDeleteContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteContact?.name}</span>? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContact(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
