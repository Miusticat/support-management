"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit2, Trash2, Check, X, Shield, Loader2 } from "lucide-react";

interface SupportMember {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SupportMembersManager() {
  const [members, setMembers] = useState<SupportMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<any>(null);

  // Add new member form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit member
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/support-members");
      if (!res.ok) {
        throw new Error("Failed to fetch support members");
      }
      const data = await res.json();
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    // Fetch user permissions
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.permissions) setPermissions(data.permissions);
      })
      .catch(() => {});
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/support-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add member");
      }

      setSuccess("Support member added successfully");
      setNewName("");
      setShowAddForm(false);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error adding member");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = (member: SupportMember) => {
    setEditingId(member.id);
    setEditName(member.name);
    setEditActive(member.is_active);
  };

  const handleUpdate = async () => {
    if (!editName.trim() || !editingId) return;

    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/support-members/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editName.trim(),
          is_active: editActive,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update member");
      }

      setSuccess("Support member updated successfully");
      setEditingId(null);
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating member");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/support-members/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete member");
      }

      setSuccess("Support member deleted successfully");
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deleting member");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditActive(true);
  };

  return (
    <div className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber" />
          <h2 className="font-semibold">Support Members</h2>
          <span className="rounded-full bg-surface-active px-2 py-0.5 text-[10px] text-text-secondary">
            {members.filter(m => m.is_active).length} active
          </span>
        </div>
        {!showAddForm && permissions?.can_manage_support && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 rounded-lg bg-amber/10 px-3 py-1.5 text-sm font-medium text-amber transition-colors hover:bg-amber/20"
          >
            <Plus className="h-4 w-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Add new member form */}
      {showAddForm && (
        <div className="mb-4 p-3 rounded-lg border border-border/50 bg-background/50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter member name"
              className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-amber focus:outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-2 rounded-lg bg-green px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green/80 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewName("");
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-hover"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error/Success messages */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
          <Shield className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-sm text-green">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-secondary py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading support members...
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-text-secondary py-4 text-center">
          No support members added yet
        </p>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 border ${
                member.is_active ? "border-border/50 bg-background/50" : "border-red/20 bg-red/5 opacity-60"
              }`}
            >
              {editingId === member.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground focus:border-amber focus:outline-none"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(e) => setEditActive(e.target.checked)}
                      className="rounded border-border bg-background text-amber focus:ring-amber focus:outline-none"
                    />
                    Active
                  </label>
                  <button
                    onClick={handleUpdate}
                    disabled={updating || !editName.trim()}
                    className="rounded-lg bg-green px-2 py-1 text-sm font-medium text-white transition-colors hover:bg-green/80 disabled:opacity-50"
                  >
                    {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-lg border border-border px-2 py-1 text-sm text-text-secondary hover:bg-surface-hover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-text-secondary">
                      {member.is_active ? (
                        <span className="rounded-full bg-green/10 px-2 py-0.5 text-xs text-green">Active</span>
                      ) : (
                        <span className="rounded-full bg-red/10 px-2 py-0.5 text-xs text-red">Inactive</span>
                      )}
                      • Added {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {permissions?.can_manage_support && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(member)}
                        className="rounded-lg border border-border px-2 py-1 text-sm text-text-secondary hover:bg-surface-hover"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="rounded-lg border border-red/30 px-2 py-1 text-sm text-red hover:bg-red/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-text-secondary">
          Support members are used to filter statistics. Only tickets handled by active support members will be included in analytics.
        </p>
      </div>
    </div>
  );
}
