# Styling Guidelines

Stack: **Tailwind CSS (utility classes) + CSS Modules (scoping)**. The
combination, not either alone, is the convention.

## Rules

1. **Design tokens live in exactly one place**: the `@theme` block in
   `styles/global.css` (Tailwind v4 CSS-first config) — brand colors, font
   families, and any other reusable token. Never hardcode a brand hex value
   or font name directly in a component; reference the token
   (`text-primary`, `font-display`) instead. If a project uses an older
   Tailwind major without CSS-first `@theme`, put the same tokens in
   `tailwind.config.js` under `theme.extend` instead — one source either way.
2. **Every component/container with more than trivial styling gets a
   co-located `<Name>.module.css` file** in the same folder as the
   `.tsx` file. Import it as `styles` and reference classes as
   `styles.className`.
3. **At the top of every module CSS file, reference the global stylesheet**
   so `@apply` can resolve theme utilities:
   ```css
   @reference "../../styles/global.css";
   ```
   (adjust the relative path to wherever `global.css` actually lives).
4. **Prefer `@apply` with Tailwind utilities over hand-written CSS
   properties** inside module files. Drop to raw CSS only for things
   Tailwind genuinely can't express (complex pseudo-selectors, keyframes).
5. **CSS Module class names are `camelCase`**, matching how they're accessed
   in JS/TS (`styles.variantPrimary`, not `styles["variant-primary"]`).
6. **Component variants/sizes are modeled as one class per option, selected
   via a lookup map in the component**, not string concatenation logic
   scattered through JSX:
   ```ts
   const variantMap = { primary: styles.variantPrimary, ghost: styles.variantGhost, ... };
   const sizeMap = { sm: styles.sizeSm, md: styles.sizeMd, ... };
   // usage: `${styles.base} ${variantMap[variant]} ${sizeMap[size]}`
   ```
7. **Simple, one-off layout wrappers (page-level max-width/padding) may use
   inline Tailwind `className` directly**, with no module file — reserve
   module files for components that have multiple visual states/variants or
   more than a couple of style rules.
8. **Never mix a global CSS class name with a CSS Module class silently** —
   if a component needs an escape hatch for a parent-supplied class, accept
   an explicit `className` prop and append it last so caller overrides win:
   `` `${styles.base} ${variantClass} ${className}` ``.
9. **Keep `global.css` small**: the Tailwind import, the `@theme` token
   block, and true global element resets (e.g. base `body` font-family)
   only. Anything component-specific belongs in that component's module
   file, not here.
