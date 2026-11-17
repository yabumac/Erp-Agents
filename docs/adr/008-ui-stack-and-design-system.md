# ADR-008: User Interface Architecture, Component System, and Brand Packs

**Status:** Accepted  
**Date:** 2026-11-02  
**Deciders:** Core Engineering Team & Product Design

## Context
The platform must support "rebranding in under a day" while maintaining an uncompromising standard of software craftsmanship:
1. Calm, fast, dense, professional aesthetic suitable for operational tools (ERP, CRM, Mail, Voice).
2. Complete brand token isolation: Brand packs must re-skin colors, typography, borders, radii, logos, empty states, and document templates without altering React component code.
3. Accessible, keyboard-first interactions with a unified Command Palette (`Cmd/Ctrl+K`).
4. Reusable data tables supporting sorting, filtering, saved views, column reordering, bulk actions, and virtualization.
5. Rich visual flow builders (voice call flows, automations) and rich text authoring with merge tags.

## Alternatives Considered
- **Tailwind UI / Pre-built templates:** Too opinionated, difficult to dynamically tokenize across multi-tenant white-label customers.
- **Ant Design / Material UI:** Heavy bundle size, difficult to style deeply with modern Tailwind utility workflows, opinionated aesthetic.
- **Tailwind CSS + shadcn/ui Primitives + CSS Custom Properties:** Headless, unstyled Radix UI primitives with Tailwind styling driven entirely by CSS custom properties (`--primary`, `--radius`, `--font-sans`, etc.). Zero runtime CSS overhead, accessible by default, and trivial to override per brand pack.

## Decision
We establish a dedicated component package in **`packages/ui`**:
1. **Core UI Primitives:**
   - Built on **Radix UI** headless primitives and styled with **Tailwind CSS v3/v4**.
   - Includes standard button, dialog, dropdown, popover, sheet, tabs, toast, and form controls.
2. **Design Token Architecture:**
   - Theme variables are declared as CSS custom properties (`:root { --brand-primary: 220 85% 55%; --radius: 0.5rem; }`).
   - Dark mode styles are mathematically derived from token scales rather than manually duplicated.
3. **Brand Pack Interface (`packages/brand/<customer>`):**
   - Each brand pack exports a declarative configuration:
     ```typescript
     export interface BrandPack {
       id: string;
       name: string;
       legalName: string;
       assets: { logoLight: string; logoDark: string; favicon: string; appIcon: string };
       tokens: { colors: ColorScale; radius: string; fontFamilies: FontConfig; density: 'compact' | 'comfortable' };
       copy: { loginTitle: string; loginSubtitle: string; emailFooter: string; supportEmail: string };
       templates: { emailShell: string; invoicePdf: React.ComponentType<any> };
       defaultPersona: { name: string; tone: string; signoff: string };
     }
     ```
   - Brand packs are validated using `pnpm brand:validate`, checking asset presence, WCAG 2.2 AA color contrast ratios, and template compilation.
4. **Data Tables:**
   - Powered by **TanStack Table v8** with server-side and client-side sorting, column visibility toggles, keyboard navigation, and saved view state persistence.
5. **Interactive Specialist Editors:**
   - **Command Palette:** Powered by **`cmdk`**, aggregating routes, contacts, deals, and quick actions from all enabled module manifests.
   - **Canvas Flow Builder:** Powered by **`@xyflow/react`** (React Flow) for voice call flows and automation triggers.
   - **Rich Text & Email Editor:** Powered by **TipTap** with custom extensions for merge-tag chips (`{{first_name}}`) and AI polish actions.
   - **PDF Generation:** Powered by **`@react-pdf/renderer`** for pixel-perfect invoice and document generation matching brand tokens.

## Consequences
### Positive
- Changing a brand pack instantly transforms the entire application shell, emails, and PDFs with zero code modifications.
- High-performance, lightweight client bundles with zero runtime CSS-in-JS parsing.
- Accessible, keyboard-navigable interface complying with WCAG 2.2 AA.

### Negative / Trade-offs
- Setting up comprehensive Storybook stories and token verification tests requires initial development investment.

## References
- shadcn/ui Design System: https://ui.shadcn.com
- Radix UI Primitives: https://www.radix-ui.com
- TanStack Table Documentation: https://tanstack.com/table
- xyflow (React Flow): https://reactflow.dev
- TipTap Rich Text Editor: https://tiptap.dev
