# St. George Capital Website v2

A modern, Citadel-inspired website for St. George Capital featuring a portfolio dashboard, research CMS, and team management system.

## Features

### Public Website
- **8 Public Pages**: Home, Quant Trading, Quant Research, Equity & Macro Research, Research Hub, The Fund, The Team, Contact
- **Citadel-Inspired Design**: Dark theme, bold typography, smooth animations
- **Responsive**: Mobile-first design that works on all devices
- **SEO Optimized**: Proper meta tags, OpenGraph, semantic HTML

### Admin Dashboard
- **Portfolio Management**: Add, edit, and track holdings with real-time pricing
- **Performance Analytics**: Charts, metrics, and portfolio analysis
- **Research CMS**: Create, edit, and publish articles with tags and categories
- **Team Management**: Manage executive team and member rosters
- **Contact Form Management**: View and respond to contact submissions

### Technical Features
- **Real-time Market Data**: Integration with Polygon.io or Yahoo Finance (fallback)
- **Authentication**: Secure login with NextAuth and role-based access
- **Database**: PostgreSQL with Prisma ORM
- **Animations**: Framer Motion for smooth, performant animations
- **Charts**: Recharts for data visualization

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Deployment**: Vercel (recommended)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- PostgreSQL database (local or hosted)
- (Optional) Polygon.io API key for market data

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd "SGC Website"
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/sgc?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"  # Generate with: openssl rand -base64 32
```

Optional (for market data):
```env
POLYGON_API_KEY="your-polygon-api-key"
```

4. **Set up the database**

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

5. **Create your first admin user**

Run this in Prisma Studio or using a database client:

```sql
INSERT INTO "User" (id, email, "passwordHash", role, name)
VALUES (
  'cuid_example',
  'admin@stgeorgecapital.ca',
  -- Password: "admin123" (change this!)
  '$2a$10$rOzJc5vVYx.KHY5gEqKYJeYXxF8ixCZqQmzDZFqVY0EJUXGPQqY8u',
  'ADMIN',
  'Admin User'
);
```

Or use bcrypt to hash your own password:
```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password', 10);
console.log(hash);
```

6. **Start the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

## Project Structure

```
sgc-website/
├── app/                      # Next.js App Router
│   ├── (public)/            # Public pages
│   │   ├── quant-trading/
│   │   ├── quant-research/
│   │   ├── equity-macro-research/
│   │   ├── research/
│   │   ├── fund/
│   │   ├── team/
│   │   └── contact/
│   ├── api/                 # API routes
│   │   ├── auth/           # NextAuth
│   │   ├── holdings/       # Portfolio management
│   │   ├── market-data/    # Real-time pricing
│   │   └── contact/        # Contact form
│   ├── dashboard/          # Admin dashboard
│   │   ├── holdings/
│   │   ├── performance/
│   │   ├── research/
│   │   └── team/
│   ├── login/              # Login page
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Homepage
├── components/             # Reusable components
│   ├── navigation.tsx
│   ├── footer.tsx
│   ├── hero.tsx
│   ├── button.tsx
│   ├── card.tsx
│   └── section.tsx
├── lib/                    # Utilities
│   ├── prisma.ts          # Prisma client
│   ├── auth.ts            # Auth helpers
│   └── utils.ts           # General utilities
├── prisma/
│   └── schema.prisma      # Database schema
├── public/                # Static assets
├── types/                 # TypeScript types
└── README.md
```

## Usage

### Accessing the Dashboard

1. Navigate to `/login`
2. Enter your credentials
3. Access dashboard at `/dashboard`

### Adding Holdings

1. Go to Dashboard → Holdings
2. Click "Add Holding"
3. Enter ticker, quantity, cost basis, etc.
4. Market data will be fetched automatically

### Publishing Research

1. Go to Dashboard → Research
2. Click "Create Article"
3. Write your article in Markdown
4. Add tags, select category
5. Publish or save as draft

### Managing Team

1. Go to Dashboard → Team
2. Add executive members with photos
3. Set order and visibility
4. Update LinkedIn profiles

## Configuration

### Market Data API

By default, the app tries to use Polygon.io (if API key is provided), then falls back to Yahoo Finance (free but less reliable).

To use Polygon.io:
1. Sign up at [polygon.io](https://polygon.io)
2. Get your API key
3. Add to `.env`: `POLYGON_API_KEY=your-key`

### Email Notifications (Optional)

To enable email notifications for contact forms:

1. Add SMTP credentials to `.env`:
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
ADMIN_EMAIL="outreach@stgeorgecapital.ca"
```

2. Implement email sending in `/app/api/contact/route.ts`

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

For database, use:
- **Neon** (recommended): [neon.tech](https://neon.tech)
- **Supabase**: [supabase.com](https://supabase.com)
- **Railway**: [railway.app](https://railway.app)

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Development

### Database Changes

After modifying `prisma/schema.prisma`:

```bash
# Push changes to database
npx prisma db push

# Or create a migration
npx prisma migrate dev --name your_migration_name
```

### Adding New Features

1. Create your component in `/components`
2. Add API routes in `/app/api`
3. Create dashboard pages in `/app/dashboard`
4. Update types in `/types` if needed

## Troubleshooting

### "Prisma Client not generated"
```bash
npx prisma generate
```

### Database connection issues
- Check your `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Verify network connectivity to database

### Market data not loading
- Check API key is set correctly
- Verify ticker symbols are valid
- Check network requests in browser DevTools

### Authentication issues
- Verify `NEXTAUTH_SECRET` is set
- Clear browser cookies
- Check user exists in database

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

© 2026 St. George Capital Educational Society. All rights reserved.

## Support

For questions or issues:
- Email: outreach@stgeorgecapital.ca
- Open an issue on GitHub

## Roadmap

- [ ] Email notifications for contact forms
- [ ] Advanced portfolio analytics
- [ ] Export reports to PDF
- [ ] Member portal
- [ ] Event management system
- [ ] Newsletter integration

