// src/components/ClientComponents/MyProjects/MyProjects.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import API from '../../../api/axios';
import CryptoJS from 'crypto-js';
import './MyProjects.css';

/* ============================================================
   HELPERS
============================================================ */
const formatCurrency = (val) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);

const formatLKR = (val) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 2,
  }).format(val || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatFullDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTimestamp = (d) => {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
};

const daysLeft = (deadline) => {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline) - new Date()) / (1000 * 60 * 60 * 24));
};

const asArray = (res) => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const getRawId = (v) => {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    return (
      v.freelancerId ||
      v.projectId ||
      v.clientId ||
      v.userId ||
      v.categoryId ||
      v.applicationId ||
      v._id ||
      v.id ||
      null
    );
  }
  return String(v);
};

const eqId = (a, b) => {
  const idA = getRawId(a);
  const idB = getRawId(b);
  if (!idA || !idB) return false;
  return String(idA) === String(idB);
};

/* ---------- Self-healing fallback payment creator ---------- */
const postPaymentWithFallbacks = async (basePayload) => {
  const paymentTypeCandidates = ['milestone', 'fixed', 'project', 'full', 'Milestone', 'Fixed', 'Project', 'deposit'];
  const methodCandidates = [basePayload.paymentMethod, 'card', 'credit_card', 'PayHere', 'online', 'bank_transfer', 'other'];

  let lastError = null;

  for (const pType of paymentTypeCandidates) {
    for (const pMethod of methodCandidates) {
      try {
        const payload = {
          ...basePayload,
          paymentType: pType,
          paymentMethod: pMethod,
        };
        const res = await API.post('/payments', payload);
        console.log('✅ Payment recorded successfully with paymentType:', pType, 'paymentMethod:', pMethod);
        return res.data;
      } catch (err) {
        lastError = err;
        if (err?.response?.status !== 400 && err?.response?.status !== 422) {
          throw err;
        }
      }
    }
  }

  // Fallback without paymentType field if schema allows
  try {
    const payloadNoType = { ...basePayload };
    delete payloadNoType.paymentType;
    const res = await API.post('/payments', payloadNoType);
    return res.data;
  } catch (err) {
    throw lastError || err;
  }
};

const StatusPill = ({ status }) => {
  const map = {
    draft: { label: 'Draft', cls: 'mp-pill-gray' },
    open: { label: 'Open', cls: 'mp-pill-green' },
    active: { label: 'In Progress', cls: 'mp-pill-blue' },
    'in-progress': { label: 'In Progress', cls: 'mp-pill-blue' },
    in_progress: { label: 'In Progress', cls: 'mp-pill-blue' },
    review: { label: 'In Review', cls: 'mp-pill-amber' },
    completed: { label: 'Completed', cls: 'mp-pill-purple' },
    cancelled: { label: 'Cancelled', cls: 'mp-pill-red' },
    pending: { label: 'Pending', cls: 'mp-pill-amber' },
    accepted: { label: 'Accepted', cls: 'mp-pill-green' },
    rejected: { label: 'Rejected', cls: 'mp-pill-red' },
  };
  const b = map[status] || { label: status || 'Unknown', cls: 'mp-pill-gray' };
  return <span className={`mp-pill ${b.cls}`}>{b.label}</span>;
};

const TABS = [
  { id: 'all', label: 'All Projects', icon: '📁' },
  { id: 'draft', label: 'Drafts', icon: '📝' },
  { id: 'open', label: 'Open', icon: '📢' },
  { id: 'active', label: 'In Progress', icon: '⚡' },
  { id: 'completed', label: 'Completed', icon: '✅' },
  { id: 'cancelled', label: 'Cancelled', icon: '🚫' },
];

/* ============================================================
   MAIN COMPONENT
============================================================ */
export default function MyProjects() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');

  // Detail drawer
  const [detail, setDetail] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');

  // Checkout and PayHere States
  const [checkoutProject, setCheckoutProject] = useState(null);
  const [billingForm, setBillingForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: 'Colombo',
  });

  // Action modals
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Task creation form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    budget: '',
    priority: 'medium',
    deadline: '',
  });
  const [taskFormError, setTaskFormError] = useState('');
  const [taskSubmitting, setTaskSubmitting] = useState(false);

  const currentUserId = user?.userId || user?._id || user?.id;

  const flashNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 5000);
  };

  /* ---------- Fetch Data ---------- */
  const fetchProjects = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      setError('');

      const [
        clientsRes,
        projRes,
        catRes,
        appRes,
        payRes,
        freelancersRes,
        usersRes,
      ] = await Promise.all([
        API.get('/clients').catch(() => ({ data: [] })),
        API.get('/projects').catch(() => ({ data: [] })),
        API.get('/categories').catch(() => ({ data: [] })),
        API.get('/applications').catch(() => ({ data: [] })),
        API.get('/payments').catch(() => ({ data: [] })),
        API.get('/freelancers').catch(() => ({ data: [] })),
        API.get('/users').catch(() => ({ data: [] })),
      ]);

      const allClients = asArray(clientsRes);
      const allProjects = asArray(projRes);
      const allCategories = asArray(catRes);
      const allApps = asArray(appRes);
      const allPayments = asArray(payRes);
      const allFreelancers = asArray(freelancersRes);
      const allUsers = asArray(usersRes);

      const myClient = allClients.find((c) => eqId(c.userId, currentUserId));
      const clientId = myClient?.clientId || myClient?._id;

      if (!clientId) {
        setError('Client profile not found. Please complete your profile setup.');
        setLoading(false);
        return;
      }

      const myProjects = allProjects.filter((p) => eqId(p.clientId, clientId));

      const catMap = new Map();
      allCategories.forEach((c) => {
        const id = c.categoryId || c._id;
        if (id) catMap.set(String(id), c);
      });

      const appStats = {};
      allApps.forEach((a) => {
        const pid = getRawId(a.projectId);
        if (!pid) return;
        if (!appStats[pid]) appStats[pid] = { total: 0, pending: 0, accepted: 0 };
        appStats[pid].total += 1;
        if (a.status === 'pending') appStats[pid].pending += 1;
        if (a.status === 'accepted') appStats[pid].accepted += 1;
      });

      const payStats = {};
      allPayments.forEach((p) => {
        const pid = getRawId(p.projectId);
        if (!pid) return;
        if (!payStats[pid]) payStats[pid] = { paid: 0, count: 0 };
        if (p.status === 'completed') payStats[pid].paid += p.amount || 0;
        payStats[pid].count += 1;
      });

      const resolved = myProjects.map((p) => {
        const pid = p.projectId || p._id;
        const fid = getRawId(p.freelancerId);
        const catObj = catMap.get(String(getRawId(p.categoryId)));
        const dLeft = daysLeft(p.deadline);
        const tasks = p.tasks || [];

        let freelancer = null;
        if (fid) {
          const fDoc = allFreelancers.find(
            (f) => eqId(f.freelancerId, fid) || eqId(f._id, fid)
          );
          if (fDoc) {
            const uDoc = allUsers.find((u) => eqId(u, fDoc.userId));
            freelancer = {
              id: fid,
              freelancerId: fid,
              name: uDoc
                ? `${uDoc.firstName || ''} ${uDoc.lastName || ''}`.trim() || uDoc.username
                : 'Freelancer',
              headline: fDoc.headline || 'Professional Freelancer',
              profileImage: uDoc?.profileImage || fDoc.profileImage || '',
              hourlyRate: fDoc.hourlyRate || 0,
              jobSuccessRate: fDoc.jobSuccessRate || 0,
              rating: fDoc.dashboardStats?.averageRating || fDoc.rating || 0,
              isTopRated: fDoc.isTopRated || false,
              email: uDoc?.email || '',
            };
          }
        }

        const completedTasks = tasks.filter((t) => t.status === 'completed').length;

        return {
          projectId: pid,
          raw: p,
          title: p.title || 'Untitled Project',
          description: p.description || '',
          categoryName: catObj?.name || 'General',
          categoryIcon: catObj?.icon || '📁',
          budget: p.budget || 0,
          status: p.status || 'draft',
          startDate: p.startDate,
          deadline: p.deadline,
          daysLeft: dLeft,
          isOverdue: dLeft !== null && dLeft < 0 && p.status !== 'completed',
          isUrgent:
            dLeft !== null &&
            dLeft >= 0 &&
            dLeft <= 7 &&
            (p.status === 'active' || p.status === 'in-progress'),
          progress: p.progress || 0,
          tasks,
          totalTasks: tasks.length,
          completedTasks,
          freelancer,
          applications: appStats[pid] || { total: 0, pending: 0, accepted: 0 },
          payments: payStats[pid] || { paid: 0, count: 0 },
          submittedFiles: p.submittedFiles || [],
          metadata: p.metadata || {},
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });

      setProjects(resolved);
    } catch (err) {
      console.error('❌ Failed to load projects:', err);
      setError('Failed to load your projects. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  /* ---------- PayHere Return Callback Handler ---------- */
  useEffect(() => {
    const checkPaymentRedirect = async () => {
      const paymentSuccess = searchParams.get('payment_success');
      const orderIdParam = searchParams.get('order_id') || searchParams.get('tempTxnId');

      let savedPayment = null;
      try {
        const raw =
          sessionStorage.getItem('pending_payhere_payment') ||
          localStorage.getItem('pending_payhere_payment');
        if (raw) savedPayment = JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read cached payment metadata', e);
      }

      if (paymentSuccess === 'true' || (savedPayment && orderIdParam)) {
        setLoading(true);
        try {
          console.log('🔄 Executing PayHere DB sync...');

          // 1. Fetch live projects and freelancers
          const [projRes, freelancersRes] = await Promise.all([
            API.get('/projects').catch(() => ({ data: [] })),
            API.get('/freelancers').catch(() => ({ data: [] })),
          ]);

          const allProjects = asArray(projRes);
          const allFreelancers = asArray(freelancersRes);

          const targetProjectId = searchParams.get('projectId') || savedPayment?.projectId;

          const matchedProject = allProjects.find(
            (p) => eqId(p.projectId, targetProjectId) || eqId(p._id, targetProjectId)
          );

          const projectId = getRawId(matchedProject?.projectId || targetProjectId);
          const projectDbId = matchedProject?._id || matchedProject?.projectId || targetProjectId;
          const clientId = getRawId(matchedProject?.clientId || savedPayment?.clientId);
          const freelancerId = getRawId(matchedProject?.freelancerId || savedPayment?.freelancerId);
          const projectBudget = Number(matchedProject?.budget || savedPayment?.budget || 0);
          const projectTitle = matchedProject?.title || savedPayment?.title || 'Project';
          const transactionId = orderIdParam || savedPayment?.orderId || `PAY_${Date.now()}`;

          // 2. Mark Project Completed in database first
          const idCandidates = [projectDbId, projectId, targetProjectId].filter(Boolean);
          let projectUpdated = false;

          for (const pid of idCandidates) {
            try {
              await API.put(`/projects/${pid}`, {
                status: 'completed',
                progress: 100,
              });
              projectUpdated = true;
              console.log('✅ Project status updated to completed via ID:', pid);
              break;
            } catch (err) {
              console.warn(`Could not update project via ID ${pid}:`, err?.message);
            }
          }

          if (!projectUpdated) {
            console.error('Could not update project status with any ID candidate');
          }

          // 3. Post Payment with self-healing fallback
          const paymentPayload = {
            paymentId: `PAY_${Date.now()}`,
            projectId: projectId,
            clientId: clientId,
            freelancerId: freelancerId,
            amount: projectBudget > 0 ? projectBudget : 100,
            currency: 'USD',
            paymentMethod: 'card',
            transactionId: transactionId,
            status: 'completed',
            paymentType: 'milestone', // Clean lowercase enum value
            description: `Payment for project: ${projectTitle}`,
            paidAt: new Date().toISOString(),
          };

          await postPaymentWithFallbacks(paymentPayload);

          // 4. Send Notification to Freelancer
          if (freelancerId) {
            const flDoc = allFreelancers.find(
              (f) => eqId(f.freelancerId, freelancerId) || eqId(f._id, freelancerId)
            );
            if (flDoc?.userId) {
              API.post('/notifications', {
                userId: flDoc.userId,
                type: 'payment',
                title: 'Payment Received! 💰',
                message: `You received $${projectBudget} for completing "${projectTitle}".`,
                projectId: projectId,
                isRead: false,
                createdAt: new Date().toISOString(),
              }).catch(() => {});
            }
          }

          // 5. Clean cache and query params
          sessionStorage.removeItem('pending_payhere_payment');
          localStorage.removeItem('pending_payhere_payment');
          setSearchParams({});

          // Automatically navigate to completed tab
          setActiveTab('completed');

          flashNotice(
            `🎉 Payment of $${projectBudget} (LKR ${(
              projectBudget * 300
            ).toLocaleString()}) successfully processed! Project marked as Completed.`
          );
          await fetchProjects();
        } catch (syncErr) {
          console.error('❌ Detailed DB Payment Sync Error:', syncErr?.response?.data || syncErr);
          setError(
            syncErr?.response?.data?.message ||
              'Payment succeeded, but recording to the database encountered an issue. Please check server logs.'
          );
        } finally {
          setLoading(false);
        }
      }
    };

    checkPaymentRedirect();
  }, [searchParams, setSearchParams, fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* ---------- Sync Detail Pane ---------- */
  useEffect(() => {
    if (!detail) return;
    const updated = projects.find((p) => eqId(p.projectId, detail.projectId));
    if (updated) setDetail(updated);
  }, [projects]);

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.payments.paid, 0);
    return {
      total: projects.length,
      draft: projects.filter((p) => p.status === 'draft').length,
      open: projects.filter((p) => p.status === 'open').length,
      active: projects.filter(
        (p) => p.status === 'active' || p.status === 'in-progress' || p.status === 'review'
      ).length,
      completed: projects.filter((p) => p.status === 'completed').length,
      cancelled: projects.filter((p) => p.status === 'cancelled').length,
      totalBudget,
      totalSpent,
      pendingApps: projects.reduce((s, p) => s + p.applications.pending, 0),
    };
  }, [projects]);

  const tabCounts = useMemo(
    () => ({
      all: stats.total,
      draft: stats.draft,
      open: stats.open,
      active: stats.active,
      completed: stats.completed,
      cancelled: stats.cancelled,
    }),
    [stats]
  );

  const filtered = useMemo(() => {
    let list = projects.filter((p) => {
      if (activeTab !== 'all') {
        if (activeTab === 'active') {
          if (
            p.status !== 'active' &&
            p.status !== 'in-progress' &&
            p.status !== 'review'
          )
            return false;
        } else if (p.status !== activeTab) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !p.title.toLowerCase().includes(q) &&
          !p.description.toLowerCase().includes(q) &&
          !p.categoryName.toLowerCase().includes(q) &&
          !(p.freelancer?.name || '').toLowerCase().includes(q)
        )
          return false;
      }

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'budget-high') return b.budget - a.budget;
      if (sortBy === 'budget-low') return a.budget - b.budget;
      if (sortBy === 'progress') return b.progress - a.progress;
      if (sortBy === 'deadline') {
        if (a.daysLeft === null) return 1;
        if (b.daysLeft === null) return -1;
        return a.daysLeft - b.daysLeft;
      }
      return 0;
    });

    return list;
  }, [projects, activeTab, search, sortBy]);

  const taskBudgetSummary = useMemo(() => {
    if (!detail) return { allocated: 0, remaining: 0, isExceeded: false };
    const allocated = (detail.tasks || []).reduce(
      (sum, t) => sum + (Number(t.budget) || 0),
      0
    );
    const remaining = detail.budget - allocated;
    return {
      allocated,
      remaining,
      isExceeded: allocated > detail.budget,
    };
  }, [detail]);

  /* ---------- Initiate PayHere Checkout Flow ---------- */
  const initiateCheckout = (project) => {
    setCheckoutProject(project);
    setBillingForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '0771234567',
      address: user?.location || 'Main Street',
      city: 'Colombo',
    });
    setDetail(null);
  };

  /* ---------- Execute PayHere Standard Form POST Redirection ---------- */
  const handlePayHereRedirection = (e) => {
    e.preventDefault();
    if (!checkoutProject) return;

    const merchantId = import.meta.env.VITE_PAYHERE_MERCHANT_ID || '1224433';
    const merchantSecret =
      import.meta.env.VITE_PAYHERE_MERCHANT_SECRET ||
      'MTE2NDA1NTU4MzA0Nzc2MDkzNzg4OTYxOTAzMzk0ODUxNDk5MTA=';

    const projectId = getRawId(checkoutProject.projectId || checkoutProject._id);
    const orderId = `ORDER_${projectId}_${Date.now()}`;

    // Convert USD budget to LKR ($1 USD = 300 LKR)
    const rawAmount = checkoutProject.budget * 300;
    const formattedAmount = Number(rawAmount).toFixed(2);
    const currency = 'LKR';

    // 1. Generate Security MD5 Hash
    const hashedSecret = CryptoJS.MD5(merchantSecret).toString().toUpperCase();
    const hashString = merchantId + orderId + formattedAmount + currency + hashedSecret;
    const finalHash = CryptoJS.MD5(hashString).toString().toUpperCase();

    // 2. Cache transaction metadata to prevent context loss on redirect
    const pendingData = {
      orderId,
      projectId,
      projectDbId: checkoutProject._id || checkoutProject.projectId,
      clientId: getRawId(checkoutProject.clientId),
      freelancerId: getRawId(checkoutProject.freelancerId),
      budget: Number(checkoutProject.budget) || 0,
      title: checkoutProject.title,
      timestamp: Date.now(),
    };
    sessionStorage.setItem('pending_payhere_payment', JSON.stringify(pendingData));
    localStorage.setItem('pending_payhere_payment', JSON.stringify(pendingData));

    // 3. Define Return and Cancel Callbacks
    const currentBaseUrl = window.location.origin;
    const returnUrl = `${currentBaseUrl}/client/my-projects?payment_success=true&projectId=${projectId}&order_id=${orderId}`;
    const cancelUrl = `${currentBaseUrl}/client/my-projects?payment_cancelled=true`;

    // 4. Build Form Payload
    const formFields = {
      merchant_id: merchantId,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: 'https://skillora.com/api/webhooks/payhere',
      order_id: orderId,
      items: `Project completion: ${checkoutProject.title}`,
      currency: currency,
      amount: formattedAmount,
      first_name: billingForm.firstName || 'Client',
      last_name: billingForm.lastName || 'User',
      email: billingForm.email || 'client@example.com',
      phone: billingForm.phone || '0771234567',
      address: billingForm.address || 'Sri Lanka',
      city: billingForm.city || 'Colombo',
      country: 'Sri Lanka',
      hash: finalHash,
    };

    // 5. Submit form to PayHere Sandbox
    const checkoutForm = document.createElement('form');
    checkoutForm.method = 'POST';
    checkoutForm.action = 'https://sandbox.payhere.lk/pay/checkout';

    Object.keys(formFields).forEach((key) => {
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = key;
      hiddenInput.value = formFields[key];
      checkoutForm.appendChild(hiddenInput);
    });

    document.body.appendChild(checkoutForm);
    checkoutForm.submit();
  };

  /* ---------- General actions ---------- */
  const handleAction = async () => {
    if (!confirmAction) return;
    const { type, project } = confirmAction;

    setActionBusy(true);
    try {
      const pid = getRawId(project.projectId);

      if (type === 'publish') {
        await API.put(`/projects/${pid}`, { status: 'open' });
      } else if (type === 'cancel') {
        await API.put(`/projects/${pid}`, { status: 'cancelled' });
      } else if (type === 'delete') {
        await API.delete(`/projects/${pid}`);
      }

      await fetchProjects();
      setConfirmAction(null);
      if (type === 'delete') setDetail(null);
      flashNotice(`Project ${type} action completed successfully`);
    } catch (err) {
      console.error('Action failed:', err);
      setError(err.response?.data?.message || 'Operation failed. Please try again.');
      setConfirmAction(null);
    } finally {
      setActionBusy(false);
    }
  };

  /* ---------- Task Operations ---------- */
  const validateTaskForm = () => {
    if (!taskForm.title.trim()) return 'Task title is required.';
    if (!taskForm.description.trim()) return 'Task description is required.';
    const cost = Number(taskForm.budget);
    if (!taskForm.budget || isNaN(cost) || cost < 0)
      return 'Task cost must be a valid positive number.';

    const newAllocated = taskBudgetSummary.allocated + cost;
    if (newAllocated > detail.budget) {
      return `Allocating task budget will exceed the project bounds by ${formatCurrency(
        newAllocated - detail.budget
      )}. Remaining budget: ${formatCurrency(taskBudgetSummary.remaining)}`;
    }
    return '';
  };

  const handleAddTask = async () => {
    const err = validateTaskForm();
    if (err) {
      setTaskFormError(err);
      return;
    }

    setTaskSubmitting(true);
    setTaskFormError('');

    try {
      const newTask = {
        taskId: `TASK_${Date.now()}`,
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        budget: Number(taskForm.budget),
        budgetType: 'fixed',
        deadline: taskForm.deadline || null,
        priority: taskForm.priority,
        status: 'pending',
        progress: 0,
        clientNote: '',
        freelancerNote: '',
        sections: [],
        requestedAt: new Date(),
        createdAt: new Date(),
      };

      const updatedTasks = [...(detail.tasks || []), newTask];

      await API.put(`/projects/${getRawId(detail.projectId)}`, {
        tasks: updatedTasks,
      });

      setTaskForm({
        title: '',
        description: '',
        budget: '',
        priority: 'medium',
        deadline: '',
      });
      setShowTaskForm(false);
      await fetchProjects();
      flashNotice(`✅ Task "${newTask.title}" added successfully`);
    } catch (err) {
      console.error('Failed to add task:', err);
      setTaskFormError(
        err.response?.data?.message || 'Failed to save task. Please try again.'
      );
    } finally {
      setTaskSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;

    try {
      const updatedTasks = (detail.tasks || []).filter(
        (t) => !eqId(t.taskId || t._id, taskId)
      );
      await API.put(`/projects/${getRawId(detail.projectId)}`, {
        tasks: updatedTasks,
      });
      await fetchProjects();
      flashNotice('Task deleted');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  if (loading) {
    return (
      <div className="mp-loading">
        <div className="mp-spinner" />
        <p>Synchronizing payment and projects with database...</p>
      </div>
    );
  }

  return (
    <div className="mp-page">
      {/* HERO */}
      <div className="mp-hero">
        <div className="mp-hero-inner">
          <div className="mp-hero-text">
            <span className="mp-hero-badge">📂 Project Manager</span>
            <h1>My Projects</h1>
            <p>Track, manage and pay for your active projects on Skillora.</p>
          </div>
          <Link to="/client/post-project" className="mp-hero-btn">
            + Post New Project
          </Link>
        </div>
      </div>

      {/* STATS STRIP */}
      <div className="mp-stats-strip">
        <div className="mp-stat blue">
          <div className="mp-stat-icon">📁</div>
          <div>
            <span className="mp-stat-num">{stats.total}</span>
            <span className="mp-stat-lbl">Total Projects</span>
          </div>
        </div>
        <div className="mp-stat green">
          <div className="mp-stat-icon">⚡</div>
          <div>
            <span className="mp-stat-num">{stats.active}</span>
            <span className="mp-stat-lbl">In Progress</span>
          </div>
        </div>
        <div className="mp-stat purple">
          <div className="mp-stat-icon">✅</div>
          <div>
            <span className="mp-stat-num">{stats.completed}</span>
            <span className="mp-stat-lbl">Completed</span>
          </div>
        </div>
        <div className="mp-stat amber">
          <div className="mp-stat-icon">📩</div>
          <div>
            <span className="mp-stat-num">{stats.pendingApps}</span>
            <span className="mp-stat-lbl">Pending Proposals</span>
          </div>
        </div>
        <div className="mp-stat indigo">
          <div className="mp-stat-icon">💰</div>
          <div>
            <span className="mp-stat-num">{formatCurrency(stats.totalSpent)}</span>
            <span className="mp-stat-lbl">Total Spent</span>
          </div>
        </div>
      </div>

      <div className="mp-container">
        {error && (
          <div className="mp-alert">
            <span>⚠️</span>
            <p>{error}</p>
            <button onClick={() => setError('')}>×</button>
          </div>
        )}

        {notice && (
          <div className="mp-alert success">
            <span>✅</span>
            <p>{notice}</p>
            <button onClick={() => setNotice('')}>×</button>
          </div>
        )}

        {/* TABS */}
        <div className="mp-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`mp-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span className="mp-tab-icon">{t.icon}</span>
              {t.label}
              <span className="mp-tab-count">{tabCounts[t.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="mp-toolbar">
          <div className="mp-search">
            <span className="mp-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by title, description, category or freelancer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="mp-search-clear" onClick={() => setSearch('')}>
                ×
              </button>
            )}
          </div>

          <select
            className="mp-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="budget-high">Budget: High to Low</option>
            <option value="budget-low">Budget: Low to High</option>
            <option value="progress">Progress: Most Complete</option>
            <option value="deadline">Deadline: Soonest</option>
          </select>

          <div className="mp-view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              ▦
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              ☰
            </button>
          </div>
        </div>

        <div className="mp-count">
          Showing <strong>{filtered.length}</strong> of <strong>{projects.length}</strong> projects
        </div>

        {/* PROJECT LIST */}
        {filtered.length === 0 ? (
          <div className="mp-empty">
            <div className="mp-empty-icon">
              {projects.length === 0 ? '🚀' : '🔍'}
            </div>
            <h3>
              {projects.length === 0
                ? "You haven't posted any projects yet"
                : 'No projects match your filters'}
            </h3>
            <p>
              {projects.length === 0
                ? 'Post your first project and start receiving proposals from talented freelancers.'
                : 'Try changing the tab, adjusting your search, or resetting filters.'}
            </p>
            {projects.length === 0 ? (
              <Link to="/client/post-project" className="mp-btn mp-btn-primary">
                🚀 Post Your First Project
              </Link>
            ) : (
              <button
                className="mp-btn mp-btn-outline"
                onClick={() => {
                  setSearch('');
                  setActiveTab('all');
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className={`mp-list ${viewMode}`}>
            {filtered.map((p) => (
              <div
                key={p.projectId}
                className={`mp-card ${p.isOverdue ? 'overdue' : ''}`}
                onClick={() => {
                  setDetail(p);
                  setDetailTab('overview');
                }}
              >
                <div className="mp-card-head">
                  <div className="mp-card-badges">
                    <span className="mp-cat-badge">
                      {p.categoryIcon} {p.categoryName}
                    </span>
                    <StatusPill status={p.status} />
                    {p.isOverdue && <span className="mp-pill mp-pill-red">Overdue</span>}
                    {p.isUrgent && <span className="mp-pill mp-pill-amber">Due Soon</span>}
                  </div>
                  <div className="mp-card-budget">{formatCurrency(p.budget)}</div>
                </div>

                <h3 className="mp-card-title">{p.title}</h3>
                <p className="mp-card-desc">
                  {p.description.length > 140
                    ? `${p.description.slice(0, 140)}...`
                    : p.description}
                </p>

                <div className="mp-progress-block">
                  <div className="mp-progress-head">
                    <span>Progress</span>
                    <strong>{p.progress}%</strong>
                  </div>
                  <div className="mp-progress-bar">
                    <div
                      className={`mp-progress-fill ${
                        p.status === 'completed' ? 'done' : ''
                      }`}
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  {p.totalTasks > 0 && (
                    <span className="mp-task-count">
                      {p.completedTasks} of {p.totalTasks} tasks completed
                    </span>
                  )}
                </div>

                <div className="mp-freelancer-row">
                  {p.freelancer ? (
                    <>
                      <div className="mp-fl-avatar">
                        {p.freelancer.profileImage ? (
                          <img
                            src={p.freelancer.profileImage}
                            alt={p.freelancer.name}
                          />
                        ) : (
                          p.freelancer.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="mp-fl-info">
                        <strong>{p.freelancer.name}</strong>
                        <span>
                          ⭐ {p.freelancer.rating.toFixed(1)} ·{' '}
                          {p.freelancer.jobSuccessRate}% success
                        </span>
                      </div>
                      {p.freelancer.isTopRated && (
                        <span className="mp-top-rated">Top Rated</span>
                      )}
                    </>
                  ) : (
                    <div className="mp-no-freelancer">
                      <span className="mp-nf-icon">👤</span>
                      <span>No freelancer assigned yet</span>
                    </div>
                  )}
                </div>

                <div className="mp-card-footer">
                  <div className="mp-metric">
                    <span className="mp-m-label">Deadline</span>
                    <strong className={p.isOverdue ? 'danger' : ''}>
                      {formatDate(p.deadline)}
                    </strong>
                  </div>
                  <div className="mp-metric">
                    <span className="mp-m-label">Time Left</span>
                    <strong
                      className={p.isOverdue ? 'danger' : p.isUrgent ? 'warn' : ''}
                    >
                      {p.daysLeft === null
                        ? '—'
                        : p.daysLeft < 0
                        ? `${Math.abs(p.daysLeft)}d overdue`
                        : `${p.daysLeft} days`}
                    </strong>
                  </div>
                  <div className="mp-metric">
                    <span className="mp-m-label">Proposals</span>
                    <strong>
                      {p.applications.total}
                      {p.applications.pending > 0 && (
                        <span className="mp-new-dot">
                          {p.applications.pending} new
                        </span>
                      )}
                    </strong>
                  </div>
                  <div className="mp-metric">
                    <span className="mp-m-label">Paid</span>
                    <strong className="success">
                      {formatCurrency(p.payments.paid)}
                    </strong>
                  </div>
                </div>

                <div className="mp-card-cta">View Full Details →</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ============ DETAIL DRAWER ============ */}
      {detail && (
        <div className="mp-drawer-overlay" onClick={() => setDetail(null)}>
          <div className="mp-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mp-drawer-head">
              <button className="mp-drawer-close" onClick={() => setDetail(null)}>
                ✕
              </button>
              <div className="mp-drawer-badges">
                <span className="mp-cat-badge light">
                  {detail.categoryIcon} {detail.categoryName}
                </span>
                <StatusPill status={detail.status} />
              </div>
              <h2>{detail.title}</h2>
              <div className="mp-drawer-meta">
                <span>📅 Created {formatDate(detail.createdAt)}</span>
                <span>•</span>
                <span>🔄 Updated {formatDate(detail.updatedAt)}</span>
              </div>
            </div>

            <div className="mp-drawer-tabs">
              <button
                className={`mp-drawer-tab ${detailTab === 'overview' ? 'active' : ''}`}
                onClick={() => setDetailTab('overview')}
              >
                📋 Overview
              </button>
              <button
                className={`mp-drawer-tab ${detailTab === 'tasks' ? 'active' : ''}`}
                onClick={() => setDetailTab('tasks')}
              >
                ✓ Tasks ({detail.tasks.length})
              </button>
              <button
                className={`mp-drawer-tab ${detailTab === 'submissions' ? 'active' : ''}`}
                onClick={() => setDetailTab('submissions')}
              >
                📎 Submissions ({detail.submittedFiles?.length || 0})
              </button>
            </div>

            <div className="mp-drawer-body">
              {detailTab === 'overview' && (
                <>
                  <div className="mp-d-stats">
                    <div>
                      <span>Budget</span>
                      <strong className="green">{formatCurrency(detail.budget)}</strong>
                    </div>
                    <div>
                      <span>Paid</span>
                      <strong>{formatCurrency(detail.payments.paid)}</strong>
                    </div>
                    <div>
                      <span>Progress</span>
                      <strong>{detail.progress}%</strong>
                    </div>
                    <div>
                      <span>Proposals</span>
                      <strong>{detail.applications.total}</strong>
                    </div>
                  </div>

                  <section className="mp-d-section">
                    <h4>📆 Timeline</h4>
                    <div className="mp-timeline">
                      <div className="mp-tl-item">
                        <span className="mp-tl-dot start" />
                        <div>
                          <strong>Start Date</strong>
                          <span>{formatFullDate(detail.startDate)}</span>
                        </div>
                      </div>
                      <div className="mp-tl-line" />
                      <div className="mp-tl-item">
                        <span
                          className={`mp-tl-dot ${detail.isOverdue ? 'overdue' : 'end'}`}
                        />
                        <div>
                          <strong>Deadline</strong>
                          <span className={detail.isOverdue ? 'danger' : ''}>
                            {formatFullDate(detail.deadline)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mp-d-progress">
                      <div className="mp-progress-bar lg">
                        <div
                          className={`mp-progress-fill ${
                            detail.status === 'completed' ? 'done' : ''
                          }`}
                          style={{ width: `${detail.progress}%` }}
                        />
                      </div>
                      <span>{detail.progress}% Complete</span>
                    </div>
                  </section>

                  <section className="mp-d-section">
                    <h4>📄 Description</h4>
                    <p className="mp-d-text">{detail.description}</p>
                  </section>

                  <section className="mp-d-section">
                    <h4>👤 Assigned Freelancer</h4>
                    {detail.freelancer ? (
                      <div className="mp-d-freelancer">
                        <div className="mp-fl-avatar lg">
                          {detail.freelancer.profileImage ? (
                            <img
                              src={detail.freelancer.profileImage}
                              alt={detail.freelancer.name}
                            />
                          ) : (
                            detail.freelancer.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="mp-d-fl-info">
                          <div className="mp-d-fl-name">
                            <strong>{detail.freelancer.name}</strong>
                          </div>
                          <p>{detail.freelancer.headline}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mp-d-empty">
                        <span>👤</span>
                        <div>
                          <strong>No freelancer assigned</strong>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              {detailTab === 'tasks' && (
                <>
                  <div className="mp-budget-summary">
                    <div className="mp-budget-row">
                      <div>
                        <span className="mp-bs-label">Project Budget</span>
                        <strong className="mp-bs-total">
                          {formatCurrency(detail.budget)}
                        </strong>
                      </div>
                      <div>
                        <span className="mp-bs-label">Allocated to Tasks</span>
                        <strong>{formatCurrency(taskBudgetSummary.allocated)}</strong>
                      </div>
                      <div>
                        <span className="mp-bs-label">Remaining</span>
                        <strong className="green">
                          {formatCurrency(taskBudgetSummary.remaining)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {(detail.status === 'active' ||
                    detail.status === 'in-progress' ||
                    detail.status === 'open' ||
                    detail.status === 'draft') &&
                    !showTaskForm && (
                      <button
                        className="mp-btn mp-btn-primary full"
                        onClick={() => setShowTaskForm(true)}
                      >
                        + Add New Task
                      </button>
                    )}

                  {showTaskForm && (
                    <section className="mp-task-form-card">
                      <h4>Create New Task</h4>
                      <div className="mp-form-field">
                        <label>Task Title *</label>
                        <input
                          type="text"
                          value={taskForm.title}
                          onChange={(e) =>
                            setTaskForm({ ...taskForm, title: e.target.value })
                          }
                          placeholder="e.g. Design landing page mockup"
                        />
                      </div>
                      <div className="mp-form-field">
                        <label>Description *</label>
                        <textarea
                          rows="3"
                          value={taskForm.description}
                          onChange={(e) =>
                            setTaskForm({ ...taskForm, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="mp-form-grid">
                        <div className="mp-form-field">
                          <label>Cost</label>
                          <input
                            type="number"
                            value={taskForm.budget}
                            onChange={(e) =>
                              setTaskForm({ ...taskForm, budget: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="mp-form-actions">
                        <button
                          className="mp-btn mp-btn-outline"
                          onClick={() => setShowTaskForm(false)}
                        >
                          Cancel
                        </button>
                        <button
                          className="mp-btn mp-btn-primary"
                          onClick={handleAddTask}
                        >
                          Add Task
                        </button>
                      </div>
                    </section>
                  )}

                  <section className="mp-d-section">
                    <h4>📋 Tasks ({detail.tasks.length})</h4>
                    <div className="mp-task-list">
                      {detail.tasks.map((task, idx) => (
                        <div key={idx} className="mp-task">
                          <strong>{task.title}</strong>
                          <p>{task.description}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="mp-drawer-foot">
              {(detail.status === 'active' ||
                detail.status === 'in-progress' ||
                detail.status === 'review') && (
                <button
                  className="mp-btn mp-btn-success"
                  onClick={() => initiateCheckout(detail)}
                >
                  💳 Pay & Complete Project
                </button>
              )}
              <button className="mp-btn mp-btn-outline" onClick={() => setDetail(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ 2-COLUMN PAYHERE CHECKOUT MODAL ============ */}
      {checkoutProject && (
        <div className="mp-modal-overlay" onClick={() => setCheckoutProject(null)}>
          <div className="mp-modal checkout-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mp-modal-close-btn" onClick={() => setCheckoutProject(null)}>
              ×
            </div>

            <div className="checkout-header-row">
              <div className="checkout-icon">💳</div>
              <div>
                <h3>PayHere Sandbox Checkout</h3>
                <p className="checkout-sub">
                  Milestone payment for: <strong>{checkoutProject.title}</strong>
                </p>
              </div>
            </div>

            <div className="order-summary-box">
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Project Budget</span>
                  <strong>{formatCurrency(checkoutProject.budget)} USD</strong>
                </div>
                <div className="summary-item">
                  <span>Conversion Rate</span>
                  <span>$1 USD = 300.00 LKR</span>
                </div>
                <div className="summary-item total">
                  <span>Total Payable (LKR)</span>
                  <strong className="green-text">
                    {formatLKR(checkoutProject.budget * 300)} LKR
                  </strong>
                </div>
              </div>
            </div>

            <form onSubmit={handlePayHereRedirection} className="billing-form">
              <div className="form-title">Customer Billing Details</div>

              <div className="billing-grid-2">
                <div className="field-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={billingForm.firstName}
                    onChange={(e) =>
                      setBillingForm({ ...billingForm, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={billingForm.lastName}
                    onChange={(e) =>
                      setBillingForm({ ...billingForm, lastName: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    value={billingForm.email}
                    onChange={(e) =>
                      setBillingForm({ ...billingForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="field-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={billingForm.phone}
                    onChange={(e) =>
                      setBillingForm({ ...billingForm, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="field-group">
                  <label>Billing Address *</label>
                  <input
                    type="text"
                    value={billingForm.address}
                    onChange={(e) =>
                      setBillingForm({ ...billingForm, address: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="field-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={billingForm.city}
                    onChange={(e) =>
                      setBillingForm({ ...billingForm, city: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-info-note">
                🔒 <strong>Secured with PayHere 256-bit Sandbox Encryption.</strong> Use test
                cards on sandbox payment gateway.
              </div>

              <div className="mp-modal-actions checkout">
                <button
                  type="button"
                  className="mp-btn mp-btn-outline"
                  onClick={() => setCheckoutProject(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="mp-btn mp-btn-success">
                  🚀 Proceed to Pay {formatLKR(checkoutProject.budget * 300)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}