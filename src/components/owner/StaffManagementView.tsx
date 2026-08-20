import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  KeyRound,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { usePos } from '../../context/PosContext.js';
import { User, UserRole } from '../../types.js';

interface StaffManagementProps {
  onRequireOwnerAuth: (config: any) => void;
}

export const StaffManagementView: React.FC<StaffManagementProps> = ({ onRequireOwnerAuth }) => {
  const { users, currentUser, refreshUsers, setCurrentUser, shifts, sales } = usePos();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Add / Edit Staff Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('CASHIER');
  const [pin, setPin] = useState('1234');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingUser(null);
    setName('');
    setUsername('');
    setRole('CASHIER');
    setPin('1234');
    setEmail('');
    setAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username || user.name.toLowerCase().replace(/\s+/g, ''));
    setRole(user.role);
    setPin(''); // Leave blank if not changing
    setEmail(user.email || '');
    setAvatar(user.avatar || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Employee full name is required.');
      return;
    }

    if (!editingUser && (!pin || pin.length < 4)) {
      setErrorMsg('4-digit PIN is required for terminal login.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingUser) {
        // Edit existing user
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            role,
            email: email || undefined,
            pin: pin ? pin : undefined,
            avatar: avatar || undefined,
            operatorRole: currentUser.role,
            operatorName: currentUser.name,
            operatorId: currentUser.id,
          }),
        });

        const data = await res.json();
        setIsSubmitting(false);

        if (data.success) {
          setIsModalOpen(false);
          setSuccessToast(`Updated account for ${name}`);
          setTimeout(() => setSuccessToast(null), 3000);
          refreshUsers();
        } else {
          setErrorMsg(data.error || 'Failed to update employee account.');
        }
      } else {
        // Create new user
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: {
              name,
              username: username.trim() || name.toLowerCase().replace(/\s+/g, ''),
              role,
              pin,
              email: email || undefined,
              avatar: avatar || undefined,
            },
            operatorRole: currentUser.role,
            operatorName: currentUser.name,
            operatorId: currentUser.id,
          }),
        });

        const data = await res.json();
        setIsSubmitting(false);

        if (data.success) {
          setIsModalOpen(false);
          setSuccessToast(`Added new staff member: ${name}`);
          setTimeout(() => setSuccessToast(null), 3000);
          refreshUsers();
        } else {
          setErrorMsg(data.error || 'Failed to add employee account.');
        }
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Network error');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser.id) {
      alert('You cannot delete your own active account.');
      return;
    }

    if (user.role === 'OWNER') {
      alert('Primary Owner account cannot be deleted.');
      return;
    }

    if (confirm(`Are you sure you want to remove ${user.name} (${user.role})?`)) {
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            operatorRole: currentUser.role,
            operatorName: currentUser.name,
            operatorId: currentUser.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccessToast(`Removed employee ${user.name}`);
          setTimeout(() => setSuccessToast(null), 3000);
          refreshUsers();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-900 border-purple-300 font-bold';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-300 font-semibold';
      case 'CASHIER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-medium';
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            <span>Staff & Access Management</span>
          </h2>
          <p className="text-xs text-slate-500">
            Control terminal access, employee login PINs, and role-based permissions (Cashier, Manager, Owner).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Role Permission Matrix Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <Shield className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Role Permission Matrix & Floor Security
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>CASHIER ROLE</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-800 font-bold">Standard</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Front-of-house register operations, taking orders, processing payments, and printing thermal receipts.
            </p>
            <div className="text-[10px] space-y-1 text-slate-600 font-mono">
              <div>✓ Process Cash / GCash / Maya Orders</div>
              <div>✓ Open & Close Shift Cash Float</div>
              <div>🔒 Voiding requires Owner/Manager PIN</div>
              <div>🔒 Custom discounts {'>'}10% require approval</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>MANAGER ROLE</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-200 text-blue-800 font-bold">Supervisory</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Floor supervisor responsible for stock-in purchases, ingredient adjustments, and approving voids.
            </p>
            <div className="text-[10px] space-y-1 text-slate-600 font-mono">
              <div>✓ Stock-In Raw Ingredients & Purchases</div>
              <div>✓ Resolve Shift Discrepancies</div>
              <div>✓ Authorize Voids & Staff Overrides</div>
              <div>🔒 Cannot alter Master PIN or delete logs</div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>OWNER ROLE</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 font-bold">Full Admin</span>
            </div>
            <p className="text-[11px] text-purple-800">
              Complete administrative access over financial Profit & Loss reports, recipe costs, and master store settings.
            </p>
            <div className="text-[10px] space-y-1 text-slate-600 font-mono">
              <div>✓ Full P&L Statement & Margin Reports</div>
              <div>✓ Master Security PIN Controls</div>
              <div>✓ Recipe Unit Costing & Pricing</div>
              <div>✓ Unrestricted Override Authority</div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Roster Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Search and Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff by name, role, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
            {(['ALL', 'CASHIER', 'MANAGER', 'OWNER'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  roleFilter === r
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4">Terminal PIN</th>
                <th className="py-3 px-4">Email / Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => {
                const isCurrentActive = user.id === currentUser.id;
                const userSalesCount = sales.filter((s) => s.cashierId === user.id).length;

                return (
                  <tr key={user.id} className={`hover:bg-slate-50/70 transition-colors ${isCurrentActive ? 'bg-amber-50/30' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                          alt={user.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isCurrentActive && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                                Active Terminal User
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {user.id} • {userSalesCount} transactions rung up
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] border ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-slate-600">
                        <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                        <span>••••</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {user.email || <span className="text-slate-400 italic">None</span>}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Active</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!isCurrentActive && (
                          <button
                            onClick={() => setCurrentUser(user)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                            title="Switch terminal to this user"
                          >
                            Switch to
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Edit Staff Member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {user.role !== 'OWNER' && (
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No employees matching your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>{editingUser ? `Edit Account: ${editingUser.name}` : 'Add New Employee'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Full Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role:</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                  >
                    <option value="CASHIER">CASHIER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="OWNER">OWNER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingUser ? 'New Login PIN (optional):' : 'Terminal Login PIN:'}
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder={editingUser ? 'Leave blank to keep' : '4-digit PIN'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address (Optional):</label>
                <input
                  type="email"
                  placeholder="maria@cafepos.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Image URL (Optional):</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingUser ? 'Update Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
