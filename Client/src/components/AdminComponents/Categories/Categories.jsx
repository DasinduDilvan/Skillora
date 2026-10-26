// src/components/AdminComponents/Categories/Categories.jsx
import { useState, useEffect, useCallback } from 'react';
import API from '../../../api/axios';
import '../Users/Users.css';
import './Categories.css';

const asArray = (res) => {
  const data = res?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const rid = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;

  return value.categoryId || value._id || value.id;
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
      const categoryList = asArray(res);

      setCategories(
        categoryList.sort(
          (a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)
        )
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
      icon: category.icon || '📁',
      image: category.image || '',
      isActive: category.isActive ?? true,
      displayOrder: category.displayOrder || 0,
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

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;

    try {
      await API.delete(`/categories/${rid(category)}`);
      showToast('Category deleted');
      fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete', 'error');
    }
  };

  const toggleActive = async (category) => {
    try {
      await API.put(`/categories/${rid(category)}`, {
        isActive: !category.isActive,
      });

      showToast(`Category ${category.isActive ? 'deactivated' : 'activated'}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      showToast('Failed to update', 'error');
    }
  };

  const filtered = categories.filter((category) =>
    !search ||
    (category.name || '').toLowerCase().includes(search.toLowerCase())
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

        {/* Add Category button is retained */}
        <button className="adm-btn primary" onClick={openCreate}>
          + Add Category
        </button>
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

            {/* Add Category option is retained when the list is empty */}
            <button className="adm-btn primary" onClick={openCreate}>
              Create First Category
            </button>
          </div>
        ) : (
          filtered.map((category) => (
            <div
              key={rid(category)}
              className={`cat-card ${!category.isActive ? 'inactive' : ''}`}
            >
              <div className="cat-icon">{category.icon || '📁'}</div>

              <div className="cat-body">
                <h3>{category.name}</h3>
                <p>{category.description || 'No description'}</p>

                <div className="cat-meta">
                  <span>
                    Order: <strong>{category.displayOrder || 0}</strong>
                  </span>
                </div>
              </div>

              {/* Status and actions appear in one column, four rows */}
              <div className="cat-right-col">
                <span
                  className={`adm-status ${
                    category.isActive ? 'active' : 'inactive'
                  }`}
                >
                  {category.isActive ? '✓ Active' : '⏸ Inactive'}
                </span>

                <button
                  type="button"
                  className="adm-btn-sm"
                  onClick={() => openEdit(category)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="adm-btn-sm warn"
                  onClick={() => toggleActive(category)}
                >
                  {category.isActive ? 'Disable' : 'Enable'}
                </button>

                <button
                  type="button"
                  className="adm-btn-sm danger"
                  onClick={() => deleteCategory(category)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE / EDIT CATEGORY MODAL */}
      {showForm && (
        <div
          className="adm-modal-overlay"
          onClick={() => setShowForm(false)}
        >
          <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>{editing ? 'Edit Category' : 'Create Category'}</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="adm-modal-body">
              <div className="adm-field">
                <label htmlFor="category-name">Name *</label>
                <input
                  id="category-name"
                  type="text"
                  className="adm-input"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="adm-field">
                <label htmlFor="category-description">Description</label>
                <textarea
                  id="category-description"
                  className="adm-input"
                  rows="3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="adm-grid-2">
                <div className="adm-field">
                  <label htmlFor="category-icon">Icon (Emoji)</label>
                  <input
                    id="category-icon"
                    type="text"
                    className="adm-input"
                    value={form.icon}
                    onChange={(e) =>
                      setForm({ ...form, icon: e.target.value })
                    }
                    placeholder="📁"
                  />
                </div>

                <div className="adm-field">
                  <label htmlFor="category-order">Display Order</label>
                  <input
                    id="category-order"
                    type="number"
                    className="adm-input"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        displayOrder: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="adm-field">
                <label htmlFor="category-image">Image URL (optional)</label>
                <input
                  id="category-image"
                  type="url"
                  className="adm-input"
                  value={form.image}
                  onChange={(e) =>
                    setForm({ ...form, image: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>

              <label className="adm-checkbox">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm({ ...form, isActive: e.target.checked })
                  }
                />
                <span>Active (visible to users)</span>
              </label>

              <div className="adm-modal-actions">
                <button
                  type="button"
                  className="adm-btn"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>

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