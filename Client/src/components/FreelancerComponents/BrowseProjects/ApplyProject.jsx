import { useState } from 'react';
import API from '../../../api/axios';
import './ApplyProject.css';

const INITIAL_FORM = {
  coverLetter: '',
  proposedBudget: '',
  budgetType: 'fixed',
  estimatedDuration: '',
  durationUnit: 'weeks',
};

const COVER_MIN_LENGTH = 50;

export default function ApplyProject({ projectId, freelancerId, onBack, onSuccess }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.coverLetter.trim()) {
      e.coverLetter = 'Cover letter / pitch is required.';
    } else if (form.coverLetter.trim().length < COVER_MIN_LENGTH) {
      e.coverLetter = `Cover letter must be at least ${COVER_MIN_LENGTH} characters. Explain your process and approach.`;
    }

    const budgetVal = Number(form.proposedBudget);
    if (!form.proposedBudget) {
      e.proposedBudget = 'Proposed bid amount is required.';
    } else if (isNaN(budgetVal) || budgetVal <= 0) {
      e.proposedBudget = 'Provide a valid positive bid amount.';
    }

    const durationVal = Number(form.estimatedDuration);
    if (!form.estimatedDuration) {
      e.estimatedDuration = 'Estimated completion duration is required.';
    } else if (isNaN(durationVal) || durationVal <= 0) {
      e.estimatedDuration = 'Provide a valid positive completion duration.';
    }

    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!freelancerId) {
      setApiError('You must complete your Freelancer profile before applying to projects.');
      return;
    }

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    setApiError('');

    const payload = {
      projectId,
      freelancerId,
      coverLetter: form.coverLetter.trim(),
      proposedBudget: Number(form.proposedBudget),
      budgetType: form.budgetType,
      estimatedDuration: Number(form.estimatedDuration),
      durationUnit: form.durationUnit,
      status: 'pending',
    };

    try {
      await API.post('/applications', payload);
      onSuccess();
    } catch (err) {
      console.error('Proposal submission failed:', err);
      setApiError(err.response?.data?.message || err.message || 'Failed to submit proposal. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ap-page">
      <div className="ap-back-bar">
        <button className="ap-back-btn" onClick={onBack}>
          ← Back to Project Details
        </button>
      </div>

      <div className="ap-header">
        <h1>Submit Proposal</h1>
        <p>Introduce yourself, describe your execution process, bid your price, and outline your timeline.</p>
      </div>

      {apiError && <div className="ap-alert error">{apiError}</div>}

      <form className="ap-form" onSubmit={handleSubmit} noValidate>
        <section className="ap-card">
          <div className="ap-card-head">
            <h2>Proposal Details</h2>
            <p>Customize terms to match your availability and delivery parameters</p>
          </div>

          <div className="ap-row">
            <div className="ap-input-group">
              <label htmlFor="proposedBudget">
                Proposed Bid Amount (USD) <span className="req">*</span>
              </label>
              <div className="ap-price-input-wrapper">
                <span className="ap-currency-symbol">$</span>
                <input
                  type="number"
                  id="proposedBudget"
                  name="proposedBudget"
                  value={form.proposedBudget}
                  onChange={handleChange}
                  placeholder="e.g. 1200"
                  className={errors.proposedBudget ? 'is-invalid' : ''}
                />
              </div>
              {errors.proposedBudget && <span className="ap-error-text">{errors.proposedBudget}</span>}
            </div>

            <div className="ap-input-group">
              <label htmlFor="budgetType">Billing Model</label>
              <select id="budgetType" name="budgetType" value={form.budgetType} onChange={handleChange}>
                <option value="fixed">Fixed Price Contract</option>
                <option value="hourly">Hourly Rate Basis</option>
              </select>
            </div>
          </div>

          <div className="ap-row">
            <div className="ap-input-group">
              <label htmlFor="estimatedDuration">
                Estimated Delivery Time <span className="req">*</span>
              </label>
              <input
                type="number"
                id="estimatedDuration"
                name="estimatedDuration"
                value={form.estimatedDuration}
                onChange={handleChange}
                placeholder="e.g. 3"
                className={errors.estimatedDuration ? 'is-invalid' : ''}
              />
              {errors.estimatedDuration && <span className="ap-error-text">{errors.estimatedDuration}</span>}
            </div>

            <div className="ap-input-group">
              <label htmlFor="durationUnit">Timeline Unit</label>
              <select id="durationUnit" name="durationUnit" value={form.durationUnit} onChange={handleChange}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </section>

        <section className="ap-card">
          <div className="ap-card-head">
            <h2>Professional Pitch</h2>
            <p>Describe your approach, outline execution phases, and link relevant portfolio items</p>
          </div>

          <div className="ap-input-group">
            <label htmlFor="coverLetter">
              Proposal / Cover Letter <span className="req">*</span>
            </label>
            <textarea
              id="coverLetter"
              name="coverLetter"
              rows="10"
              value={form.coverLetter}
              onChange={handleChange}
              placeholder="Why are you a good fit for this project? Outline your process, mention similar work, and list milestones..."
              className={errors.coverLetter ? 'is-invalid' : ''}
            />
            <div className="ap-input-footer">
              <span className="ap-error-text">{errors.coverLetter}</span>
              <span className="ap-counter">
                {form.coverLetter.length} chars (minimum {COVER_MIN_LENGTH})
              </span>
            </div>
          </div>
        </section>

        <div className="ap-form-actions">
          <button type="button" className="ap-btn ap-btn-secondary" onClick={onBack} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="ap-btn ap-btn-primary" disabled={submitting}>
            {submitting ? 'Submitting proposal...' : 'Submit Proposal'}
          </button>
        </div>
      </form>
    </div>
  );
}