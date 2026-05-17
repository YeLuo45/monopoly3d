/**
 * Lesson Plan Store - Assignment and curriculum management
 * 
 * Features:
 * - Create/edit/delete lesson plans with assigned questions
 * - Set due dates and difficulty targets
 * - Track student completion and scores
 * - Export/import lesson plans as JSON
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const LESSON_CATEGORIES = ['math', 'shape', 'time', 'geography', 'science', 'reading', 'life', 'emotion', 'animal'];

// Generate unique ID
const genId = () => `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Default lesson plan template
const createDefaultPlan = (overrides = {}) => ({
  id: genId(),
  title: '',
  description: '',
  questions: [], // Array of question IDs
  categories: [...LESSON_CATEGORIES], // All enabled by default
  difficulty: 'MEDIUM', // EASY, MEDIUM, HARD, MASTER
  targetScore: 80, // Target completion score (%)
  dueDate: null, // ISO date string
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignedStudents: [], // student IDs or class names
  status: 'draft', // draft, published, archived
  ...overrides,
});

export const useLessonPlanStore = create(
  persist(
    (set, get) => ({
      // All lesson plans
      lessonPlans: [],

      // Currently selected plan ID
      selectedPlanId: null,

      // ============ CRUD Operations ============

      /**
       * Create a new lesson plan
       */
      createPlan: (initialData = {}) => {
        const plan = createDefaultPlan(initialData);
        set(state => ({
          lessonPlans: [...state.lessonPlans, plan],
          selectedPlanId: plan.id,
        }));
        return plan.id;
      },

      /**
       * Get a plan by ID
       */
      getPlan: (planId) => {
        return get().lessonPlans.find(p => p.id === planId) || null;
      },

      /**
       * Update a lesson plan
       */
      updatePlan: (planId, updates) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p =>
            p.id === planId
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      /**
       * Delete a lesson plan
       */
      deletePlan: (planId) => {
        set(state => ({
          lessonPlans: state.lessonPlans.filter(p => p.id !== planId),
          selectedPlanId: state.selectedPlanId === planId ? null : state.selectedPlanId,
        }));
      },

      /**
       * Duplicate a lesson plan
       */
      duplicatePlan: (planId) => {
        const plan = get().getPlan(planId);
        if (!plan) return null;

        const newPlan = createDefaultPlan({
          ...plan,
          id: genId(),
          title: `${plan.title} (副本)`,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          dueDate: null,
        });

        set(state => ({
          lessonPlans: [...state.lessonPlans, newPlan],
          selectedPlanId: newPlan.id,
        }));

        return newPlan.id;
      },

      // ============ Question Management ============

      /**
       * Add questions to a lesson plan
       * @param {string} planId
       * @param {Array} questionIds - Array of question IDs to add
       */
      addQuestions: (planId, questionIds) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p => {
            if (p.id !== planId) return p;
            const existingIds = new Set(p.questions);
            const newIds = questionIds.filter(id => !existingIds.has(id));
            return {
              ...p,
              questions: [...p.questions, ...newIds],
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      /**
       * Remove questions from a lesson plan
       * @param {string} planId
       * @param {Array} questionIds - Array of question IDs to remove
       */
      removeQuestions: (planId, questionIds) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p => {
            if (p.id !== planId) return p;
            const removeSet = new Set(questionIds);
            return {
              ...p,
              questions: p.questions.filter(id => !removeSet.has(id)),
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      /**
       * Reorder questions within a lesson plan
       * @param {string} planId
       * @param {Array} newOrder - Array of question IDs in desired order
       */
      reorderQuestions: (planId, newOrder) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p => {
            if (p.id !== planId) return p;
            // Verify all questions exist
            const currentSet = new Set(p.questions);
            const validIds = newOrder.filter(id => currentSet.has(id));
            return {
              ...p,
              questions: validIds,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },

      // ============ Assignment & Publication ============

      /**
       * Assign plan to students/classes
       * @param {string} planId
       * @param {Array} studentIds - Array of student IDs or class names
       */
      assignPlan: (planId, studentIds) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p =>
            p.id === planId
              ? { ...p, assignedStudents: studentIds, status: 'published', updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      /**
       * Set due date for a lesson plan
       * @param {string} planId
       * @param {string} dueDate - ISO date string or null
       */
      setDueDate: (planId, dueDate) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p =>
            p.id === planId
              ? { ...p, dueDate, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      /**
       * Publish a lesson plan (make it active)
       */
      publishPlan: (planId) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p =>
            p.id === planId
              ? { ...p, status: 'published', updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      /**
       * Archive a lesson plan
       */
      archivePlan: (planId) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p =>
            p.id === planId
              ? { ...p, status: 'archived', updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      // ============ Student Progress Tracking ============

      /**
       * Record student completion of a lesson plan
       * @param {string} planId
       * @param {string} studentId
       * @param {Object} result - { score, completedAt, answers }
       */
      recordCompletion: (planId, studentId, result) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p => {
            if (p.id !== planId) return p;
            const completions = { ...p.completions } || {};
            completions[studentId] = {
              ...result,
              completedAt: new Date().toISOString(),
            };
            return { ...p, completions, updatedAt: new Date().toISOString() };
          }),
        }));
      },

      /**
       * Get completion rate for a lesson plan
       * @param {string} planId
       * @returns {number} - Percentage 0-100
       */
      getCompletionRate: (planId) => {
        const plan = get().getPlan(planId);
        if (!plan || !plan.assignedStudents?.length) return 0;
        const completions = plan.completions || {};
        const completed = Object.keys(completions).length;
        return Math.round((completed / plan.assignedStudents.length) * 100);
      },

      /**
       * Get average score for a lesson plan
       * @param {string} planId
       * @returns {number} - Average score 0-100
       */
      getAverageScore: (planId) => {
        const plan = get().getPlan(planId);
        if (!plan || !plan.completions) return 0;
        const scores = Object.values(plan.completions).map(c => c.score).filter(s => typeof s === 'number');
        if (!scores.length) return 0;
        return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      },

      // ============ Import/Export ============

      /**
       * Export a lesson plan as JSON
       * @param {string} planId
       * @returns {string} - JSON string
       */
      exportPlan: (planId) => {
        const plan = get().getPlan(planId);
        if (!plan) return null;
        return JSON.stringify({
          version: '1.0',
          plan,
          exportedAt: new Date().toISOString(),
        }, null, 2);
      },

      /**
       * Import a lesson plan from JSON
       * @param {string} jsonString
       * @returns {string|null} - New plan ID or null on failure
       */
      importPlan: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          const plan = data.plan || data;
          if (!plan.title || !Array.isArray(plan.questions)) {
            throw new Error('Invalid lesson plan format');
          }
          const newPlan = createDefaultPlan({
            ...plan,
            id: genId(),
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          set(state => ({
            lessonPlans: [...state.lessonPlans, newPlan],
            selectedPlanId: newPlan.id,
          }));
          return newPlan.id;
        } catch (e) {
          console.error('Failed to import lesson plan:', e);
          return null;
        }
      },

      /**
       * Export all lesson plans as JSON
       */
      exportAllPlans: () => {
        const plans = get().lessonPlans;
        return JSON.stringify({
          version: '1.0',
          plans,
          exportedAt: new Date().toISOString(),
        }, null, 2);
      },

      /**
       * Import multiple lesson plans from JSON
       * @param {string} jsonString
       * @returns {number} - Number of plans imported
       */
      importAllPlans: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          const plans = data.plans || [data];
          const newPlans = plans
            .filter(p => p.title && Array.isArray(p.questions))
            .map(p => createDefaultPlan({
              ...p,
              id: genId(),
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));
          set(state => ({
            lessonPlans: [...state.lessonPlans, ...newPlans],
          }));
          return newPlans.length;
        } catch (e) {
          console.error('Failed to import lesson plans:', e);
          return 0;
        }
      },

      // ============ Statistics ============

      /**
       * Get all plans as categorized lists
       */
      getPlansByStatus: () => {
        const plans = get().lessonPlans;
        return {
          draft: plans.filter(p => p.status === 'draft'),
          published: plans.filter(p => p.status === 'published'),
          archived: plans.filter(p => p.status === 'archived'),
        };
      },

      /**
       * Get plans due within N days
       * @param {number} days
       */
      getUpcomingPlans: (days = 7) => {
        const now = Date.now();
        const cutoff = now + days * 24 * 60 * 60 * 1000;
        return get().lessonPlans.filter(p => {
          if (!p.dueDate || p.status === 'archived') return false;
          return new Date(p.dueDate).getTime() <= cutoff;
        });
      },

      /**
       * Get recent activity (plans created/updated recently)
       */
      getRecentActivity: (limit = 10) => {
        return [...get().lessonPlans]
          .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          .slice(0, limit);
      },

      // ============ Selection ============

      /**
       * Select a lesson plan for editing
       */
      selectPlan: (planId) => {
        set({ selectedPlanId: planId });
      },

      /**
       * Clear selection
       */
      clearSelection: () => {
        set({ selectedPlanId: null });
      },

      // ============ Categories ============

      /**
       * Update categories for a lesson plan
       * @param {string} planId
       * @param {Array} categories
       */
      updateCategories: (planId, categories) => {
        set(state => ({
          lessonPlans: state.lessonPlans.map(p =>
            p.id === planId
              ? { ...p, categories, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },
    }),
    {
      name: 'monopoly3d-lesson-plans',
    }
  )
);

// Export constants for use in components
export { LESSON_CATEGORIES };