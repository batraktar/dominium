# DOMINIUM frontend design contract

## Scope
Preserve the established DOMINIUM visual language while repairing responsive and interaction defects. This task does not introduce a redesign.

## Tokens
- Primary/deep ocean: existing Tailwind `deepOcean` / `primary` tokens.
- Secondary/cool sage: existing `coolSage` token.
- Warm surface: existing `creamBeige` token.
- Surface: white cards on deep-ocean search background.
- Dropdown option text: black for maximum contrast on white menus.
- Spacing: existing 4px-based Tailwind scale.
- Radius: 8-12px for cards and controls; pill radius for actions.

## Typography
- Display: Ermilov.
- Body and controls: Fixel Text.
- Preserve existing responsive type scale and Ukrainian copy.

## Layout
- Desktop search keeps the global header at the top.
- The search input is sticky below the header on desktop only.
- Mobile keeps the existing compact search flow and bottom navigation.
- Result cards use equal-height grid tracks and wrapping metadata.

## Components and states
- Property card: fixed media ratio, flexible body, stable action footer.
- Property facts: wrap safely; rooms are omitted for land property types.
- Price: selected currency is the primary value; alternate values appear on hover/focus for desktop and tap/focus on touch/keyboard surfaces.
- Map marker: DOM-native SVG marker with visible active/click state; no external image URL dependency.

## Accessibility
- Interactive price details must be keyboard-focusable and labelled.
- Header/search landmarks remain ordered and non-overlapping.
- Meaningful icons remain paired with visible text or accessible labels.

## Motion
- Existing short color/opacity transitions only; no decorative motion.

## Responsive behavior
- Validate at 375px, 768px, and 1280px.
- Desktop search header offset is 74px, matching the rendered global header; sticky search sits directly below it.
- No horizontal overflow in cards or controls.

## Accepted debt
- Existing mixed Tailwind and legacy CSS architecture remains unchanged for this focused release fix.
