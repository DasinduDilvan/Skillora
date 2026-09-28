// src/components/AdminComponents/Categories/Categories.jsx
import { useState, useEffect, useCallback } from 'react';
import API from '../../../api/axios';
import '../Users/Users.css';
import './Categories.css';

const asArray = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const rid = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  return v.categoryId || v._id || v.id;
};

const emptyForm = {
  name: '',
  description: '',
  icon: '📁',
  image: '',
  isActive: true,
  displayOrder: 0,
};

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/categories');
      setCategories(asArray(res).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)));
    } catch (err) {
      console.error(err);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      description: c.description || '',
      icon: c.icon || '📁',
      image: c.image || '',
      isActive: c.isActive ?? true,
      displayOrder: c.displayOrder || 0,
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Name is required', 'error');
      return;
    }
    try {
      if (editing) {
        await API.put(`/categories/${rid(editing)}`, form);
        showToast('Category updated');
      } else {
        await API.post('/categories', form);
        showToast('Category created');
      }
      setShowForm(false);
      fetchCategories();
    } catch (err) {
      showToast(err?.response?.data?.message || 'Failed to save', 'error');
    }
  };

  const deleteCategory = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try {
      await API.delete(`/categories/${rid(c)}`);
      showToast('Category deleted');
      fetchCategories();
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  };

  const toggleActive = async (c) => {
    try {
      await API.put(`/categories/${rid(c)}`, { isActive: !c.isActive });
      showToast(`Category ${c.isActive ? 'deactivated' : 'activated'}`);
      fetchCategories();
    } catch (err) {
      showToast('Failed to update', 'error');
    }
  };

  const filtered = categories.filter((c) =>
    !search || (c.name || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="adm-loading">
        <div className="adm-spinner" />
        <p>Loading categories...</p>
      </div>
    );
  }

  return (
    <div className="adm-page">
      {toast && (
        <div className={`adm-toast adm-toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.msg}
        </div>
      )}

      <div className="adm-header">
        <div>
          <h1>🏷️ Manage Categories</h1>
          <p>Create, edit and organize service categories.</p>
        </div>
        <button className="adm-btn primary" onClick={openCreate}>+ Add Category</button>
      </div>

      <div className="adm-toolbar">
        <input
          type="text"
          className="adm-search"
          placeholder="🔍 Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="cat-grid">
        {filtered.length === 0 ? (
          <div className="cat-empty">
            <p>No categories found.</p>
            <button className="adm-btn primary" onClick={openCreate}>Create First Category</button>
          </div>
        ) : (
          filtered.map((c) => (
            <div key={rid(c)} className={`cat-card ${!c.isActive ? 'inactive' : ''}`}>
              <div className="cat-icon">{c.icon || '📁'}</div>
              <div className="cat-body">
                <div className="cat-title-row">
                  <h3>{c.name}</h3>
                  <span className={`adm-status ${c.isActive ? 'active' : 'inactive'}`}>
                    {c.isActive ? '✓ Active' : '⏸ Inactive'}
                  </span>
                </div>
                <p>{c.description || 'No description'}</p>
                <div className="cat-meta">
                  <span>Order: <strong>{c.displayOrder || 0}</strong></span>
                </div>
              </div>
              <div className="cat-actions">
                <button className="adm-btn-sm" onClick={() => openEdit(c)}>Edit</button>
                <button className="adm-btn-sm warn" onClick={() => toggleActive(c)}>
                  {c.isActive ? 'Disable' : 'Enable'}
                </button>
                <button className="adm-btn-sm danger" onClick={() => deleteCategory(c)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* FORM MODAL */}
      {showForm && (
        <div className="adm-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>{editing ? 'Edit Category' : 'Create Category'}</h2>
              <button onClick={() => setShowForm(false)}>×</button>
            </div>
            <form onSubmit={handleSave} className="adm-modal-body">
              <div className="adm-field">
                <label>Name *</label>
                <input
                  type="text"
                  className="adm-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>

              <div className="adm-field">
                <label>Description</label>
                <textarea
                  className="adm-input"
                  rows="3"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="adm-grid-2">
                <div className="adm-field">
                  <label>Icon (Emoji)</label>
                  <input
                    type="text"
                    className="adm-input"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="📁"
                  />
                </div>
                <div className="adm-field">
                  <label>Display Order</label>
                  <input
                    type="number"
                    className="adm-input"
                    value={form.displayOrder}
                    onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="adm-field">
                <label>Image URL (optional)</label>
                <input
                  type="url"
                  className="adm-input"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span>Active (visible to users)</span>
              </label>

              <div className="adm-modal-actions">
                <button type="button" className="adm-btn" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="adm-btn primary">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}