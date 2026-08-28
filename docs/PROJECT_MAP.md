# Baby Secret project map

## Source hierarchy

1. **Figma** — primary source for visual implementation, responsive layouts, section order, components, typography, colors, spacing, and interaction design.
2. **babysecret.com** — business/content reference for products, categories, terminology, brand content, and existing customer journeys.

The copied Figma file link supplied is:

`https://www.figma.com/design/dUEImy7nVXKEiuOWQNJYyI/Baby-Secret--Copy-?node-id=0-1`

The copied file is accessible to the design integration. The original file remains permission-limited.

## Verified current-site inventory

The public site is a WordPress/WooCommerce installation. Its exposed store data currently includes these categories:

- Diapers
- Fragrance
- Lotion
- Oil
- Powder
- Shower Gel
- Soap
- Women (present in the current catalog and must be checked against Figma before inclusion)

The current catalog includes products such as baby wipes, sanitizing wipes, baby soaps, lotions, oils, powders, shower gels, fragrances, and bundles. Product names, prices, availability, descriptions, and imagery belong in mock/service data and must not be hardcoded into UI components.

Verified public content routes include:

| Route | Current reference |
| --- | --- |
| `/` | Home |
| `/shop` | Shop |
| `/product/[slug]` | WooCommerce product detail pattern |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/my-account` | Account |
| `/about-us` | About |
| `/contact-us` | Contact |
| `/secret-keeper-blog` | Secret Keeper Blog |

FAQ, shipping, returns, distributor, wishlist, order-confirmation, and auth routes remain planned UI routes. Their final inclusion and content should follow the Figma/business requirements, with configurable placeholder policy copy where business policy is not confirmed.

## Planned route map

## Confirmed homepage frame map

Figma desktop frame `1:3` is a 1440px-wide homepage with these confirmed sections in order:

1. `16:47` — full-bleed “Gentle care for every little moment.” hero, translucent rounded header, cart/search/account actions, and Shop Baby Care / Our Story CTAs.
2. `18:90` — “Made for little moments.” four-column benefits section.
3. `18:230` — “Their little routine starts here.” eight-card product grid and View All Products CTA.
4. `20:432` — “Build your baby's routine.” guided routine selector with category pills and routine summary.
5. `138:2` — Why Babysecret philosophy split section with baby-care image, benefits, and Learn About Us CTA.
6. `18:1149` — dark footer with newsletter subscription, Shop/Help/Discover columns, social links, and legal links.

Figma design tokens observed in these frames include Jost for UI/body, Outfit for medium section headings, Lexend for hero/display headings, blue `#005dbd`, navy `#3051a0`, deep navy `#00123e`, surface `#f9fcff`, and text `#334f6d`.

### Core commerce

- `/` — homepage
- `/shop` — listing with search, category filters, sorting, and responsive filter drawer
- `/shop/[category]` — dynamic category listing
- `/product/[slug]` — product detail, gallery, variants, quantity, cart/wishlist actions
- `/search` or design-approved search overlay — product/category search and no-results state
- `/cart` — persisted cart and order summary
- `/wishlist` — persisted wishlist
- `/checkout` — frontend-only validated checkout
- `/order-confirmation` — mock success summary

### Brand/support content

- `/about`
- `/contact`
- `/faq`
- `/shipping`
- `/returns`
- `/blog`
- `/blog/[slug]`
- `/distributor` (only if supported by the references)

### Account UI

- `/account`
- `/login`
- `/register`
- `/forgot-password`

## Component map

### Layout

`AnnouncementBar`, `Header`, `DesktopNavigation`, `MobileMenu`, `SearchOverlay`, `Footer`, `PageContainer`, `Breadcrumbs`

### UI primitives

`Button`, `IconButton`, `Input`, `Textarea`, `Select`, `Modal`, `Drawer`, `Accordion`, `Badge`, `EmptyState`, `LoadingState`, `ErrorState`, `Skeleton`

### Product

`ProductCard`, `ProductGrid`, `CategoryCard`, `ProductGallery`, `ProductInfo`, `ProductFilters`, `ProductSort`, `QuantitySelector`, `ProductBadge`, `RelatedProducts`

### Cart/wishlist

`CartDrawer`, `CartItem`, `CartSummary`, `WishlistButton`, `WishlistGrid`

### Sections

`HeroSection`, `CategorySection`, `ProductSection`, `PromotionalBanner`, `BrandValuesSection`, `BenefitsSection`, `TestimonialsSection`, `CommunitySection`, `DistributorCTA`, `NewsletterSection`

### Forms

`NewsletterForm`, `ContactForm`, `CheckoutForm`, `AuthForm`, `DistributorForm`

## Data and service boundaries

Typed domain models belong under `src/types`. Mock records belong under `src/data`. Components consume service contracts rather than importing raw records where fetching behavior may change.

Service contracts:

- `product.service.ts` — list, search, category, detail, related products
- `cart.service.ts` — totals and cart normalization
- `order.service.ts` — mock checkout and confirmation
- `customer.service.ts` — mock account/profile/address data
- `content.service.ts` — blog, FAQ, policy, and brand content
- `shipping.shipping.service.ts` — delivery quotes via Terminal Africa TShip by default (API key required), with an optional WooCommerce shipping-zone provider (Store API cart flow) and a mock zone-based fallback; shipment arrangement after payment

WooCommerce is the intended backend. The owner manages products and stock in the WooCommerce dashboard; the frontend reads public catalog data through `src/services/product.service.ts`. Private WooCommerce REST credentials must never be exposed to the browser.

Zustand owns browser-persistent cart and wishlist state. Hydration must be handled safely in the App Router. TanStack Query may be introduced later for remote API cache/mutation state without changing page components.

## Design-token checklist

The final token map must come from Figma. The current site exposes useful business-reference clues only: Space Grotesk body text, Libre Baskerville headings, navy `#111a45`, orange `#ff5100`, slate text `#424f65`, light border `#e2e6ec`, and sale red `#fd0036`. These are not final values until compared against Figma.

## QA checklist

- All routes resolve and links are valid
- TypeScript and production build pass
- Product search/filter/sort work
- Cart and wishlist persist after refresh
- Checkout validation and mock confirmation work
- Empty/loading/error states are present
- Keyboard/focus behavior works for menus, drawers, and forms
- Layouts are checked at 320, 375, 768, 1024, 1280, and 1440px
- No horizontal overflow or unsupported business claims
