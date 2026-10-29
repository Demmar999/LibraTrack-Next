"use client";
import { useMemo, useState } from "react";
import type { MemberView } from "@/lib/types";
import { api } from "@/lib/client-api";
import { formatDate, peso } from "@/lib/format";
import {
  Avatar,
  Button,
  Card,
  ConfirmModal,
  DataTable,
  EmptyState,
  Field,
  FormModal,
  StatusBadge,
  inputClass,
} from "./ui";
import { useRun } from "./use-run";

export function MembersManager({ members }: { members: MemberView[] }) {
  const [q, setQ] = useState("");
  const [add, setAdd] = useState(false);
  const [toggle, setToggle] = useState<MemberView | null>(null);
  const { run, done } = useRun();
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return members.filter(
      (m) =>
        !n ||
        m.name.toLowerCase().includes(n) ||
        m.email.toLowerCase().includes(n),
    );
  }, [members, q]);

  return (
    <Card
      title={`Members (${rows.length})`}
      action={
        <Button icon="addUser" onClick={() => setAdd(true)}>
          Add member
        </Button>
      }
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email..."
        aria-label="Search members"
        className={inputClass + " mb-4"}
      />
      <DataTable
        rows={rows}
        rowKey={(m) => m.id}
        empty={<EmptyState icon="members" title="No members found" />}
        columns={[
          {
            header: "Member",
            primary: true,
            cell: (m) => (
              <div className="flex items-center gap-3">
                <Avatar name={m.name} />
                <div>
                  <p className="font-semibold text-navy">{m.name}</p>
                  <p className="text-xs font-normal text-muted">{m.email}</p>
                </div>
              </div>
            ),
          },
          { header: "Joined", cell: (m) => formatDate(m.createdOn) },
          { header: "Borrowed now", cell: (m) => m.activeLoans },
          { header: "Total loans", cell: (m) => m.totalLoans },
          {
            header: "Unpaid fines",
            cell: (m) =>
              m.unpaid > 0 ? (
                <span className="font-semibold text-danger-dark">
                  {peso(m.unpaid)}
                </span>
              ) : (
                "—"
              ),
          },
          { header: "Status", cell: (m) => <StatusBadge status={m.status} /> },
          {
            header: "Actions",
            className: "text-right",
            cell: (m) => (
              <Button
                size="sm"
                variant="ghost"
                icon={m.status === "active" ? "block" : "success"}
                onClick={() => setToggle(m)}
              >
                {m.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            ),
          },
        ]}
      />
      {add && (
        <FormModal
          title="Add member"
          submitLabel="Create account"
          onClose={() => setAdd(false)}
          onSubmit={async (f) => {
            await api("/api/members", "POST", Object.fromEntries(f.entries()));
            done("Member added");
            setAdd(false);
          }}
        >
          <Field label="Full name">
            {(id) => (
              <input id={id} name="name" required className={inputClass} />
            )}
          </Field>
          <Field label="Email">
            {(id) => (
              <input
                id={id}
                name="email"
                type="email"
                required
                className={inputClass}
              />
            )}
          </Field>
          <Field
            label="Temporary password"
            hint="At least 6 characters. The member can change it later."
          >
            {(id) => (
              <input
                id={id}
                name="password"
                type="text"
                required
                minLength={6}
                defaultValue="member123"
                className={inputClass}
              />
            )}
          </Field>
        </FormModal>
      )}
      {toggle && (
        <ConfirmModal
          danger={toggle.status === "active"}
          title={
            toggle.status === "active" ? "Deactivate member" : "Activate member"
          }
          confirmLabel={toggle.status === "active" ? "Deactivate" : "Activate"}
          message={
            toggle.status === "active"
              ? `${toggle.name} will no longer be able to log in.`
              : `${toggle.name} will be able to log in again.`
          }
          onClose={() => setToggle(null)}
          onConfirm={async () => {
            await run(
              () =>
                api(`/api/members/${toggle.id}`, "PATCH", {
                  status: toggle.status === "active" ? "inactive" : "active",
                }),
              "Member updated",
            );
            setToggle(null);
          }}
        />
      )}
    </Card>
  );
}
