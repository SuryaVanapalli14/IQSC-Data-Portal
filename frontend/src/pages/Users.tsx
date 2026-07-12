import { useState, useEffect } from 'react';
import axios from 'axios';
import { Users as UsersIcon, UserPlus, Edit2, Trash2, Shield, Search, X } from 'lucide-react';
import { format } from 'date-fns';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'IQAC_ADMIN' | 'HOD' | 'FACULTY';
  department?: string | null;
  createdAt: string;
}

const departmentsList = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'EEE', name: 'Electrical & Electronics Engineering' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'IT', name: 'Information Technology' },
  { code: 'MBA', name: 'Master of Business Administration' },
  { code: 'MCA', name: 'Master of Computer Applications' }
];

const Users = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FACULTY' as 'IQAC_ADMIN' | 'HOD' | 'FACULTY',
    department: ''
  });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/manage-users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingUser) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/manage-users/${editingUser.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/admin/manage-users`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', password: '', role: 'FACULTY', department: '' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to save user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/manage-users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  const openEditModal = (user: UserData) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // Don't show password
      role: user.role,
      department: user.department || ''
    });
    setShowModal(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="container animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: '700', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>User Management</h1>
          <p style={{ opacity: 0.7, fontSize: '1.1rem' }}>Manage organizational accounts and access permissions.</p>
        </div>
        <button 
          onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'FACULTY', department: '' }); setShowModal(true); }}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', borderRadius: '10px' }}
        >
          <UserPlus size={20} /> Create New User
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UsersIcon size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{users.length}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Total Accounts</div>
          </div>
        </div>
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{users.filter(u => u.role === 'IQAC_ADMIN').length}</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>IQAC Administrators</div>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              className="input" 
              style={{ paddingLeft: '40px', marginBottom: 0 }} 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', textAlign: 'left' }}>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', opacity: 0.6 }}>User Details</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', opacity: 0.6 }}>Role</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', opacity: 0.6 }}>Department</th>
                <th style={{ padding: '1rem 1.5rem', fontSize: '0.85rem', opacity: 0.6 }}>Created On</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', opacity: 0.6 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{u.name}</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      background: u.role === 'IQAC_ADMIN' ? 'rgba(37, 99, 235, 0.1)' : 
                                  u.role === 'HOD' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                      color: u.role === 'IQAC_ADMIN' ? 'var(--accent-primary)' : 
                             u.role === 'HOD' ? '#10b981' : 'inherit'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem', fontWeight: '600' }}>
                    {u.department || <span style={{ opacity: 0.3 }}>—</span>}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', fontSize: '0.9rem' }}>
                    {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={() => openEditModal(u)} style={{ padding: '8px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: 'inherit' }}><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(u.id)} style={{ padding: '8px', borderRadius: '6px', background: 'transparent', border: '1px solid var(--border-color)', color: '#ef4444' }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !loading && (
            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5 }}>
              No users found matching your search.
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--card-bg)', width: '450px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: 0.5 }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Full Name</label>
                <input 
                  type="text" 
                  className="input" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Email Address</label>
                <input 
                  type="email" 
                  className="input" 
                  required 
                  value={formData.email} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{editingUser ? 'New Password (Leave blank to keep current)' : 'Password'}</label>
                <input 
                  type="password" 
                  className="input" 
                  required={!editingUser} 
                  value={formData.password} 
                  onChange={e => setFormData({ ...formData, password: e.target.value })} 
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Account Role</label>
                <select 
                  className="input" 
                  value={formData.role} 
                  onChange={e => {
                    const newRole = e.target.value as any;
                    setFormData({ ...formData, role: newRole, department: newRole === 'IQAC_ADMIN' ? '' : formData.department });
                  }}
                >
                  <option value="FACULTY">Faculty (Fill and edit forms)</option>
                  <option value="HOD">HOD (View and approve/reject responses)</option>
                  <option value="IQAC_ADMIN">IQAC Admin (Full system access)</option>
                </select>
              </div>
              {(formData.role === 'FACULTY' || formData.role === 'HOD') && (
                <div style={{ marginBottom: '2rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Department</label>
                  <select 
                    className="input" 
                    required
                    value={formData.department} 
                    onChange={e => setFormData({ ...formData, department: e.target.value })}
                  >
                    <option value="">Select Department...</option>
                    {departmentsList.map(d => (
                      <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'inherit' }}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem', borderRadius: '8px' }}>{editingUser ? 'Update Account' : 'Create Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;


