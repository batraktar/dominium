# Journey Analytics Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Додати коректну staff-only воронку й часовий тренд та відобразити їх у компактному дашборді.

**Architecture:** Django агрегує унікальні сесії по етапах і днях. React лише форматує готові ряди у легкі SVG/CSS-візуалізації без сторонніх chart-залежностей.

**Tech Stack:** Django ORM, React, SVG, CSS.

**Spec:** `docs/superpowers/specs/2026-10-27-journey-analytics-redesign.md`

## Global Constraints

- Staff-only endpoint і наявна модель подій залишаються без змін.
- Не додавати frontend-залежностей.
- Періоди: 7, 28, 90 днів.

## Review Focus

- Одна сесія з кількома подіями рахується один раз на кожному етапі.
- Дні без подій присутні у trend з нулями.
- Порожня вибірка не ламає SVG чи conversion rate.
- Воронка не показує від’ємних значень.
- Non-staff не отримує аналітику.

---

### Task 1: Backend aggregation

**Files:** `house/test_journey.py`, `dominium_backend/views/journey.py`

- [x] Додати failing test для `funnel` та суцільного `daily` ряду.
- [x] Реалізувати агрегацію унікальних session ID і заповнення нульових дат.
- [x] Запустити focused і full Django tests.

### Task 2: Staff dashboard visualization

**Files:** `frontend-react/src/features/admin/components/JourneyAnalyticsTab.jsx`, `frontend-react/src/features/admin/pages/admin-api-admin.css`, frontend tests.

- [x] Додати failing model test для нормалізації funnel/trend даних.
- [x] Додати KPI з conversion rate, SVG trend, об’ємні funnel bars і доступні підписи.
- [x] Запустити React lint, tests і production build.
